import { describe, expect, it } from "vitest";
import { AuthStorage } from "../src/core/auth-storage.ts";
import { addServiceTierToPayload } from "../src/core/extensions/builtin/service-tier.ts";
import type { ModelsJsonProvider } from "../src/core/model-config.ts";
import { ModelRuntime } from "../src/core/model-runtime.ts";
import { resolveCompatibilityRequestConfig } from "../src/core/provider-composer.ts";

describe("catalog-level upstreamModelId/serviceTier fallback", () => {
	it("falls back to the catalog model's upstreamModelId and serviceTier when nothing is configured", async () => {
		const runtime = await ModelRuntime.create({ credentials: AuthStorage.inMemory(), modelsPath: null });
		const model = runtime.getModel("openai", "gpt-5.5-fast");
		expect(model).toBeDefined();

		const config = resolveCompatibilityRequestConfig(model!, undefined, undefined);

		expect(config.upstreamModelId).toBe("gpt-5.5");
		expect(config.serviceTier).toBe("priority");
	});

	it("lets a models.json model definition override catalog values", async () => {
		const runtime = await ModelRuntime.create({ credentials: AuthStorage.inMemory(), modelsPath: null });
		const model = runtime.getModel("openai", "gpt-5.5-fast");
		expect(model).toBeDefined();

		const providerConfig: ModelsJsonProvider = {
			models: [{ id: "gpt-5.5-fast", upstreamModelId: "gpt-5.5-custom", serviceTier: "flex" }],
		};
		const config = resolveCompatibilityRequestConfig(model!, providerConfig, undefined);

		expect(config.upstreamModelId).toBe("gpt-5.5-custom");
		expect(config.serviceTier).toBe("flex");
	});

	it.each([
		["openai", "gpt-5.4-mini-fast", "gpt-5.4-mini"],
		["openai-codex", "gpt-5.6-sol-fast", "gpt-5.6-sol"],
	])("resolves %s/%s with its base wire id and priority tier", async (provider, id, upstreamId) => {
		const runtime = await ModelRuntime.create({ credentials: AuthStorage.inMemory(), modelsPath: null });
		const model = runtime.getModel(provider, id);
		expect(model).toBeDefined();

		const config = runtime.getCompatibilityRequestConfig(model!);
		const payload = addServiceTierToPayload(model!.api, { model: config.upstreamModelId }, config.serviceTier);

		expect(config.upstreamModelId).toBe(upstreamId);
		expect(config.serviceTier).toBe("priority");
		expect(payload).toEqual({ model: upstreamId, service_tier: "priority" });
	});
});

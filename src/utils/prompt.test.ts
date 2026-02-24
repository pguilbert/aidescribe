import { describe, expect, it } from "vitest";
import { generatePrompt } from "./prompt.js";

describe("generatePrompt", () => {
	it("includes locale in the prompt", () => {
		const prompt = generatePrompt("fr", 72, "conventional");
		expect(prompt).toContain("fr");
	});

	it("includes maxLength in the prompt", () => {
		const prompt = generatePrompt("en", 100, "conventional");
		expect(prompt).toContain("100");
	});

	it("includes type JSON for conventional type", () => {
		const prompt = generatePrompt("en", 72, "conventional");
		expect(prompt).toContain('"feat"');
		expect(prompt).toContain('"fix"');
		expect(prompt).toContain('"refactor"');
	});

	it("does not include type JSON for plain type", () => {
		const prompt = generatePrompt("en", 72, "plain");
		expect(prompt).not.toContain('"feat"');
		expect(prompt).not.toContain('"fix"');
	});

	it("includes current descriptions when provided", () => {
		const prompt = generatePrompt("en", 72, "conventional", ["fix: initial desc"]);
		expect(prompt).toContain("fix: initial desc");
		expect(prompt).toContain("Current change description");
	});

	it("does not include current descriptions section when empty", () => {
		const prompt = generatePrompt("en", 72, "conventional", []);
		expect(prompt).not.toContain("Current change description");
	});
});

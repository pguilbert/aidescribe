import { describe, expect, it } from "vitest";
import { parseDescribeArgsForDiff } from "./describe-args.js";

describe("parseDescribeArgsForDiff", () => {
	it("treats bare positional args as revsets", () => {
		expect(parseDescribeArgsForDiff(["abc", "def"])).toEqual({
			globalArgs: [],
			revsets: ["abc", "def"],
		});
	});

	it("parses -r flag with next-arg value", () => {
		expect(parseDescribeArgsForDiff(["-r", "abc"])).toEqual({
			globalArgs: [],
			revsets: ["abc"],
		});
	});

	it("parses -r with value stuck together (-rabc)", () => {
		expect(parseDescribeArgsForDiff(["-rabc"])).toEqual({
			globalArgs: [],
			revsets: ["abc"],
		});
	});

	it("parses --revision flag", () => {
		expect(parseDescribeArgsForDiff(["--revision", "abc"])).toEqual({
			globalArgs: [],
			revsets: ["abc"],
		});
	});

	it("parses --revisions flag", () => {
		expect(parseDescribeArgsForDiff(["--revisions", "abc"])).toEqual({
			globalArgs: [],
			revsets: ["abc"],
		});
	});

	it("parses --revision=value (equals syntax)", () => {
		expect(parseDescribeArgsForDiff(["--revision=abc"])).toEqual({
			globalArgs: [],
			revsets: ["abc"],
		});
	});

	it("collects global flags: -R with value", () => {
		expect(parseDescribeArgsForDiff(["-R", "/repo"])).toEqual({
			globalArgs: ["-R", "/repo"],
			revsets: [],
		});
	});

	it("collects global flags: -R with value stuck together", () => {
		expect(parseDescribeArgsForDiff(["-R/repo"])).toEqual({
			globalArgs: ["-R", "/repo"],
			revsets: [],
		});
	});

	it("collects global flags: --ignore-working-copy", () => {
		expect(parseDescribeArgsForDiff(["--ignore-working-copy"])).toEqual({
			globalArgs: ["--ignore-working-copy"],
			revsets: [],
		});
	});

	it("collects global flags: --color=auto (equals syntax)", () => {
		expect(parseDescribeArgsForDiff(["--color=auto"])).toEqual({
			globalArgs: ["--color=auto"],
			revsets: [],
		});
	});

	it("skips describe flag -m with value", () => {
		expect(parseDescribeArgsForDiff(["-m", "msg"])).toEqual({
			globalArgs: [],
			revsets: [],
		});
	});

	it("skips describe flag -m with value stuck together", () => {
		expect(parseDescribeArgsForDiff(["-mfoo"])).toEqual({
			globalArgs: [],
			revsets: [],
		});
	});

	it("skips describe flag --message with value", () => {
		expect(parseDescribeArgsForDiff(["--message", "msg"])).toEqual({
			globalArgs: [],
			revsets: [],
		});
	});

	it("skips describe boolean flag --stdin", () => {
		expect(parseDescribeArgsForDiff(["--stdin"])).toEqual({
			globalArgs: [],
			revsets: [],
		});
	});

	it("treats everything after -- as revsets", () => {
		expect(parseDescribeArgsForDiff(["--", "abc", "--message", "def"])).toEqual({
			globalArgs: [],
			revsets: ["abc", "--message", "def"],
		});
	});

	it("handles a complex mixed case", () => {
		expect(
			parseDescribeArgsForDiff([
				"-R",
				"/repo",
				"--ignore-working-copy",
				"-r",
				"abc",
				"-m",
				"msg",
				"def",
			]),
		).toEqual({
			globalArgs: ["-R", "/repo", "--ignore-working-copy"],
			revsets: ["abc", "def"],
		});
	});
});

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

  it("supports mixing -r forms with positional revsets", () => {
    expect(parseDescribeArgsForDiff(["-r", "abc", "def", "-rghi"])).toEqual({
      globalArgs: [],
      revsets: ["abc", "def", "ghi"],
    });
  });

  it("treats non--r flags as plain revsets", () => {
    expect(parseDescribeArgsForDiff(["--revision", "abc", "--message", "msg"])).toEqual({
      globalArgs: [],
      revsets: ["--revision", "abc", "--message", "msg"],
    });
  });
});

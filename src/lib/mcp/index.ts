import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "idia-hub-mcp",
  title: "IDIA Hub MCP",
  version: "0.1.0",
  instructions:
    "Agent integration surface for the IDIA Hub. Use `echo` to verify connectivity. Additional tools can be added over time.",
  tools: [echoTool],
});
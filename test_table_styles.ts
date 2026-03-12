import { Table } from "@cliffy/table";

console.log("=== Style 1: No border ===");
new Table()
  .header(["Label", "Short FP", "Key ID", "Status", "Expires"])
  .body([
    ["test *", "ae1fbb4", "01KKFKVCD7JT...", "ACTIVE", "Never"],
    ["prod", "5afc1bc", "01KKFKVCD7JU...", "ACTIVE", "30 days"],
  ])
  .render();

console.log("\n=== Style 2: No border, min width 10 ===");
new Table()
  .header(["Label", "Short FP", "Key ID", "Status", "Expires"])
  .body([
    ["test *", "ae1fbb4", "01KKFKVCD7JT...", "ACTIVE", "Never"],
    ["prod", "5afc1bc", "01KKFKVCD7JU...", "ACTIVE", "30 days"],
  ])
  .minColWidth(10)
  .render();

console.log("\n=== Style 3: Border (current) ===");
new Table()
  .header(["Label", "Short FP", "Key ID", "Status", "Expires"])
  .body([
    ["test *", "ae1fbb4", "01KKFKVCD7JT...", "ACTIVE", "Never"],
    ["prod", "5afc1bc", "01KKFKVCD7JU...", "ACTIVE", "30 days"],
  ])
  .border(true)
  .render();

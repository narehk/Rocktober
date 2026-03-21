# Research Command

Quick codebase research using Haiku for fast, low-cost lookups.

## Usage
```
/research <query>     - Search for files, patterns, or definitions
```

## Instructions

Use the research skill (which runs on Haiku for speed and efficiency) to quickly find information in the codebase.

### Steps

1. **Understand the Query**
   Determine what the user is looking for:
   - File locations ("where is X?")
   - Code patterns ("find all uses of Y")
   - Definitions ("what is Z?")
   - Examples ("show me TODO comments")

2. **Launch Research Agent**
   Use the Skill tool to invoke the research skill:
   ```
   Skill tool with skill: "research" and args: "<user query>"
   ```

3. **Present Results**
   The research skill will return concise results with file paths and line numbers.

### When to Use

- Finding specific files or functions quickly
- Searching for patterns across the codebase
- Looking up imports or dependencies
- Finding examples of how something is used
- Quick reference lookups

### Examples

```bash
/research where is the database config?
/research find all API routes
/research show me all TODO comments
/research what files import React?
```

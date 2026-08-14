---
"echadron": patch
---

Stop repeating the file and change count above every Edit diff. The tool header already reads `Used Edit (…/readTool.ts) · +1 -1`, and the diff below it printed `+1 -1 /full/path/to/readTool.ts` again — two extra lines on the most common tool in a session, with the full path wrapping mid-word on a narrow terminal.

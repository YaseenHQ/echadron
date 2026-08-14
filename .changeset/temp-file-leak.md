---
"echadron": patch
---

Stop leaving partial temp files behind. Data files are written to a temp sibling and renamed into place, and the temp is deleted if the write fails — but a process killed mid-write never gets to run that cleanup, so the partial file stayed forever. One cache directory had accumulated fourteen of them, tens of megabytes. Abandoned temps older than an hour are now swept on the next successful write; anything newer is left alone in case another process is still writing it.

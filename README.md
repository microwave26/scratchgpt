# ScratchGPT

\# ScratchGPT Changelog



All notable changes to ScratchGPT will be documented here.



\## \[1.0-beta.1] - 2026-10-17



\### Added

\- Groq API integration for AI responses.

\- Separate conversations using usernames.

\- Conversation history retrieval.

\- Memory reset functionality.

\- A 25-message limit per conversation.

\- Error handling for failed AI requests.



\### Changed

\- Switched the AI backend from OpenAI to Groq.

\- Updated the custom TurboWarp extension to support individual chat sessions.



\### Fixed

\- Fixed the missing `OPENAI\_API\_KEY` deployment issue by switching to `GROQ\_API\_KEY`.

\- Improved API error messages.



\### Notes

\- This is a beta release; bugs and unexpected behavior may still occur.

\- Conversation memory is currently stored in server memory and may be lost when the server restarts.




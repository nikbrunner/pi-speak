# Changelog

## [0.3.0](https://github.com/nikbrunner/pi-speak/compare/pi-speak-v0.2.0...pi-speak-v0.3.0) (2026-05-14)


### ⚠ BREAKING CHANGES

* remove session greeting feature

### Features

* **command:** add /speak toggle with persistent config ([a4b9b4e](https://github.com/nikbrunner/pi-speak/commit/a4b9b4e121ab36fad93ef9383e2bae0873688608))
* **helpers:** add getProjectName from cwd with human-readable formatting ([3cc24d8](https://github.com/nikbrunner/pi-speak/commit/3cc24d871f1ff1b74a1391d9e38b5f5574f05bc9))
* **readback:** slow default speed by 10% (-0.1), lower pitch (0.98), remove unsupported temperature ([300d0f0](https://github.com/nikbrunner/pi-speak/commit/300d0f0c57399ab3f3af387df264dcab001d8f4a))
* remove session greeting feature ([b3b1977](https://github.com/nikbrunner/pi-speak/commit/b3b1977eec73cc45e341e11e4d87bdc47d964763))
* **tts:** add OpenAI TTS provider with init validation and error surfacing ([4ed9a32](https://github.com/nikbrunner/pi-speak/commit/4ed9a3269665d7fba76e0b884431d05e8d1aaffa))


### Refactors

* **ping:** replace tmux session name with cwd-derived project name ([6a99017](https://github.com/nikbrunner/pi-speak/commit/6a9901726475b9a51bac12c9d2c6bf7a97a1a239))
* update default prompts to professional tone ([5718704](https://github.com/nikbrunner/pi-speak/commit/5718704df09cb72aec59931bb3878dedda810551))

## [0.2.0](https://github.com/nikbrunner/pi-speak/compare/pi-speak-v0.1.0...pi-speak-v0.2.0) (2026-04-12)


### Features

* add lint extension for pi coding agent ([fe617f6](https://github.com/nikbrunner/pi-speak/commit/fe617f6030bd09ed8f0d29c1d8ed9aed33d0935b))
* add test infrastructure and CI for npm release ([0eae8d6](https://github.com/nikbrunner/pi-speak/commit/0eae8d659e607fbd2667f4bd20388391456268f8))
* **config:** add customizable summarizer prompt ([2b1f2d3](https://github.com/nikbrunner/pi-speak/commit/2b1f2d3ee771efce9138e2b760043b1db4eccdca))
* **config:** add schema descriptions and voice/bitrate enums ([7ac5655](https://github.com/nikbrunner/pi-speak/commit/7ac565523baba0149ccc760ed2e7dbb71bd7532d))
* **config:** increase summarizer maxTokens from 60 to 150 ([2ed0184](https://github.com/nikbrunner/pi-speak/commit/2ed018444c1412a876f7bb814b34246adf0a3f2d))
* **config:** show validation errors in widget and revalidate on input ([bb6bed7](https://github.com/nikbrunner/pi-speak/commit/bb6bed7338cc830f021bdbd6dbf7cb3785210ce3))
* **lint:** add compile check to post-execution validation ([7e4d701](https://github.com/nikbrunner/pi-speak/commit/7e4d701055e74c5442597c9508f91b71dccafb4d))
* publish pi-speak package to npm on release ([9fe9bec](https://github.com/nikbrunner/pi-speak/commit/9fe9bec7426c0ec413888f642238dede9f19de19))
* skip TTS generation when system is muted to save costs ([5804aae](https://github.com/nikbrunner/pi-speak/commit/5804aaead9fa9004a8015e92290c1f87aa27d9b0))


### Refactors

* **config:** consolidate into versioned v1 structure with generated schema ([8666e77](https://github.com/nikbrunner/pi-speak/commit/8666e778df7acd042a9ac2b2a4f30c882ce33c0a))
* **config:** extract generateDefaultConfigJson function ([aa006a5](https://github.com/nikbrunner/pi-speak/commit/aa006a539313f6764a219917710278d1964c6a2f))
* **config:** extract validation error handling logic ([e7e9e73](https://github.com/nikbrunner/pi-speak/commit/e7e9e73b7c3d48273f4f18e75cfefc77d3a99823))
* **config:** remove env var override support ([d2bbad3](https://github.com/nikbrunner/pi-speak/commit/d2bbad31f78ef81689f108e2793fcfe756db182c))
* **config:** restructure config into modular folder with Zod validation ([8a44174](https://github.com/nikbrunner/pi-speak/commit/8a44174178166d2c212e9c45120b8ee65cfd10eb))
* **config:** return errors from config functions instead of using module state ([da21102](https://github.com/nikbrunner/pi-speak/commit/da211025b165d375c739a028d9019348dc8d873d))
* **config:** simplify revalidateConfig with IIFE ([cd251d6](https://github.com/nikbrunner/pi-speak/commit/cd251d6ab98120013714333bb33cd95a1703ab3d))
* move imports to top of config.ts ([ea7e0f5](https://github.com/nikbrunner/pi-speak/commit/ea7e0f5b26881b5e1eefb395339c8cb3ea5584ec))
* remove ~/.env file loading, use process.env directly ([f87551d](https://github.com/nikbrunner/pi-speak/commit/f87551dfa4efd2a69a43ff18387103e9ad414f85))
* remove unused shellQuote function and dead imports ([1d57b6d](https://github.com/nikbrunner/pi-speak/commit/1d57b6dc08f19b3a48e6afda6a328438eb21ef44))
* rename lint extension to checks ([45c81e4](https://github.com/nikbrunner/pi-speak/commit/45c81e4f7af58fd5ed870d3b991280403524b11f))
* restructure config schema and add session greeting ([c9f6f62](https://github.com/nikbrunner/pi-speak/commit/c9f6f6269206a98c09c40a6ed813305e1f524630))
* share UI interface type instead of inline literals ([7d31352](https://github.com/nikbrunner/pi-speak/commit/7d31352ed5d76e62c516f584a5f53c2277d4359f))


### Bug Fixes

* add debug logging and handle edge case for muted regeneration ([5804aae](https://github.com/nikbrunner/pi-speak/commit/5804aaead9fa9004a8015e92290c1f87aa27d9b0))
* add platform detection with user warning for unsupported OS ([c89a257](https://github.com/nikbrunner/pi-speak/commit/c89a257e7e6a63c74a17fbcccd41b1060257fb9b))
* add timeout to summarizer fetch call ([39c8a5a](https://github.com/nikbrunner/pi-speak/commit/39c8a5a646268d3bcaf5d84e65c9b8fc1952d8df))
* add timeout to TTS fetch call ([845231c](https://github.com/nikbrunner/pi-speak/commit/845231c3be40e765798208a0196087b658f0cb54))
* clean up orphaned cache files on playback abort ([04cfda6](https://github.com/nikbrunner/pi-speak/commit/04cfda6041dbe0f93466ae2333b5f04dcd332fce))
* improve error handling in debug logging with console fallback ([240e543](https://github.com/nikbrunner/pi-speak/commit/240e543fc2c7ff06a27264f70a1ca45dd17b0fe4))
* **lint:** use test:format script for formatting checks ([052a024](https://github.com/nikbrunner/pi-speak/commit/052a02401ae59a00beee79482a339419897cbb63))
* move pi-coding-agent to peerDependencies ([e15e844](https://github.com/nikbrunner/pi-speak/commit/e15e84446838d19514756be0195b1d0612f737ec))
* persist migrated config to file and update README with nested structure ([29ab3ec](https://github.com/nikbrunner/pi-speak/commit/29ab3ec8716942bfb5fb271bbfef11908a619ff5))
* **summarizer:** use gemini-2.5-flash-lite instead of reasoning model ([7889c27](https://github.com/nikbrunner/pi-speak/commit/7889c275a6816a02869a0e59ff884d7e921beef7))
* **tts:** set UNREAL_SPEECH_API_KEY in tests for CI ([d6ec5d9](https://github.com/nikbrunner/pi-speak/commit/d6ec5d91dcb1fe1322e9dd2f03a000711497309c))
* use SIGKILL fallback in stop() for reliable playback termination ([d3e3cf6](https://github.com/nikbrunner/pi-speak/commit/d3e3cf684f466d6e93c858e4cdf6c59e31a3f4a3))
* wire config.debug into debug module ([a0ec315](https://github.com/nikbrunner/pi-speak/commit/a0ec31549ac37411cce690d8ccf5a489ee955add))


### Documentation

* add pi-speak-dev skill and streamline AGENTS.md ([0c4a07d](https://github.com/nikbrunner/pi-speak/commit/0c4a07d5c526b22526c8d7d05e30349164f2c254))
* add summarizerModel config option and update table ([db08c75](https://github.com/nikbrunner/pi-speak/commit/db08c750b0912ff7f5026668591a06a7e1bc1841))
* clarify voice readback trigger and remove outdated features ([b2d6a38](https://github.com/nikbrunner/pi-speak/commit/b2d6a38e8d164f6575ed7372a32653e1cf6c0fd8))
* document speak() is not re-entrant ([af9cd29](https://github.com/nikbrunner/pi-speak/commit/af9cd29eace020056716fc2b9f9b1ffea92a4756))
* remove project structure section from README ([463d0fa](https://github.com/nikbrunner/pi-speak/commit/463d0fac6c711951b94c24c2640852891a81f4cf))
* replace config example with link to schema.json ([5773c5b](https://github.com/nikbrunner/pi-speak/commit/5773c5b1eda51e7962d489e0000dd4efbb4ac8e8))
* sync documentation with v1 config restructure ([235de9e](https://github.com/nikbrunner/pi-speak/commit/235de9e90aae9ea796459c0e73b3ddad4fc0ff6e))
* sync README with code changes and update TODO ([4611ae5](https://github.com/nikbrunner/pi-speak/commit/4611ae5f9b774229dc1357231221cc250d772bb5))

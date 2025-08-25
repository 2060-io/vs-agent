# Changelog

## [1.4.0](https://github.com/2060-io/vs-agent/compare/v1.3.2...v1.4.0) (2025-08-25)


### Features

* add configurable parameters support for linked vp ([#191](https://github.com/2060-io/vs-agent/issues/191)) ([bee8812](https://github.com/2060-io/vs-agent/commit/bee8812a2f1e26c0d4ba9c7a460089b2d67d9516))
* add health check endpoint and integrate with kubernetes for email alerts ([#198](https://github.com/2060-io/vs-agent/issues/198)) ([1428234](https://github.com/2060-io/vs-agent/commit/14282342f7428ac579b88e35cb04704624b34899))
* add test endpoints for verifiable credentials and presentations ([#140](https://github.com/2060-io/vs-agent/issues/140)) ([34377b1](https://github.com/2060-io/vs-agent/commit/34377b1725200964c5c7cd6a879abd1ce59b513c))
* default redirect in invitation endpoint to true ([#158](https://github.com/2060-io/vs-agent/issues/158)) ([ec208e7](https://github.com/2060-io/vs-agent/commit/ec208e7405054c19e96e742b69ff5772677e1bda))
* did:webvh creation support ([#206](https://github.com/2060-io/vs-agent/issues/206)) ([fc2a87d](https://github.com/2060-io/vs-agent/commit/fc2a87d1a6f3f448566173ceb31e69ad960f0f4d))
* enable eMRTD authenticity and integrity vs-agent ([#207](https://github.com/2060-io/vs-agent/issues/207)) ([6a52d52](https://github.com/2060-io/vs-agent/commit/6a52d5218dc08c57620bc9fa67abc152c0c60dcf))
* make public api server a nestjs app ([#169](https://github.com/2060-io/vs-agent/issues/169)) ([16ca1ae](https://github.com/2060-io/vs-agent/commit/16ca1aef5fa63b01f496a157cb37653649be601d))
* remove redundant environment variables ([#162](https://github.com/2060-io/vs-agent/issues/162)) ([a9b13e5](https://github.com/2060-io/vs-agent/commit/a9b13e52a4179374d08794042087df5cc657ac40))
* set public API and endpoints from public DID ([#175](https://github.com/2060-io/vs-agent/issues/175)) ([3e67f75](https://github.com/2060-io/vs-agent/commit/3e67f75faee4dc3b28be413658793b309dd5a783))


### Bug Fixes

* add data.json to dockerfile ([#142](https://github.com/2060-io/vs-agent/issues/142)) ([4f2b125](https://github.com/2060-io/vs-agent/commit/4f2b125b090f8798762b43b36653d48e349ba8ff))
* add release please ([#173](https://github.com/2060-io/vs-agent/issues/173)) ([62abf46](https://github.com/2060-io/vs-agent/commit/62abf4650b2760902d539d422aab37a2aceb751c))
* add root release please ([#185](https://github.com/2060-io/vs-agent/issues/185)) ([bbbb0a6](https://github.com/2060-io/vs-agent/commit/bbbb0a670659ff73e92dd79b0563fb7f2b8ebd09))
* add updateAllPackages ([#180](https://github.com/2060-io/vs-agent/issues/180)) ([03e9a40](https://github.com/2060-io/vs-agent/commit/03e9a4050b5b7b54834f4bdc378eee83fcc1ffc6))
* AnonCreds service not added to DID Document ([#168](https://github.com/2060-io/vs-agent/issues/168)) ([94f0885](https://github.com/2060-io/vs-agent/commit/94f088524c6e5b435b241031bacc60bbb98422d1))
* avoid regenerating self-signed cert on every request ([#202](https://github.com/2060-io/vs-agent/issues/202)) ([f458574](https://github.com/2060-io/vs-agent/commit/f4585742df52fa301c5cdbb08218a5cdb3afb3bc))
* change components name ([#183](https://github.com/2060-io/vs-agent/issues/183)) ([8a23fc3](https://github.com/2060-io/vs-agent/commit/8a23fc33513b8f63cf2e0f844055fe0fe260521c))
* correct structure of self-signed DID document ([#196](https://github.com/2060-io/vs-agent/issues/196)) ([4df0d5c](https://github.com/2060-io/vs-agent/commit/4df0d5ca842f23c79bcc4252ab13d94a598fcdb9))
* data.json copy in vs-agent Dockerfile ([#161](https://github.com/2060-io/vs-agent/issues/161)) ([58eab26](https://github.com/2060-io/vs-agent/commit/58eab26a19522829f47c2aa71fe8d8822dc4356d))
* don't recreate DIDComm keys at every startup ([#188](https://github.com/2060-io/vs-agent/issues/188)) ([c5f8602](https://github.com/2060-io/vs-agent/commit/c5f8602da21fd10cfa096427fcdb887d4b2072c0))
* improvement record validation ([#210](https://github.com/2060-io/vs-agent/issues/210)) ([074ac00](https://github.com/2060-io/vs-agent/commit/074ac00035ccbf6d22db8ecbbf548dab7410ade0))
* increase request limit to 5MB on nestjs demo ([#190](https://github.com/2060-io/vs-agent/issues/190)) ([113c4a3](https://github.com/2060-io/vs-agent/commit/113c4a31bcea42acff066692c443b0a00e061cc0))
* invitation to public services using pthid ([#92](https://github.com/2060-io/vs-agent/issues/92)) ([1ab0c64](https://github.com/2060-io/vs-agent/commit/1ab0c64b85cc10f615eacd0b4105a3fefd9ac9e9))
* local schemas digest sri ([#205](https://github.com/2060-io/vs-agent/issues/205)) ([accc11f](https://github.com/2060-io/vs-agent/commit/accc11f9252ad6459c26ad7d6682536cfe69aa9a))
* provide local default schema ([#204](https://github.com/2060-io/vs-agent/issues/204)) ([86509b6](https://github.com/2060-io/vs-agent/commit/86509b6349f75ac30e6a733d9a8e0820780be9fe))
* release please ([#178](https://github.com/2060-io/vs-agent/issues/178)) ([b143702](https://github.com/2060-io/vs-agent/commit/b1437022d828d684c8655762152692ab86cc046a))
* release please config ([#177](https://github.com/2060-io/vs-agent/issues/177)) ([54753ac](https://github.com/2060-io/vs-agent/commit/54753acac82b5ecbec23333b1844aa3e95ec6eb6))
* remove node-workspace ([#181](https://github.com/2060-io/vs-agent/issues/181)) ([59c0b33](https://github.com/2060-io/vs-agent/commit/59c0b3383d2e07b151480d0f8cb772a070e58e3b))
* Remove PUT method from exposed port configuration ([#187](https://github.com/2060-io/vs-agent/issues/187)) ([f312009](https://github.com/2060-io/vs-agent/commit/f312009c120cecb14fae0a30de7d091ecefdb5f9))
* remove unused anoncreds URL ([#174](https://github.com/2060-io/vs-agent/issues/174)) ([efd4bbf](https://github.com/2060-io/vs-agent/commit/efd4bbf4410052394e5961c22f812f830f26ecc5))
* support tpl on eventsBaseUrl ([#171](https://github.com/2060-io/vs-agent/issues/171)) ([3cf0021](https://github.com/2060-io/vs-agent/commit/3cf00213fc0e0696f7036861b949134b921f2561))
* update permission response ([#208](https://github.com/2060-io/vs-agent/issues/208)) ([8e32311](https://github.com/2060-io/vs-agent/commit/8e32311555eb1cc186759432c338311df547a6b6))
* update retrieve json schema ([#197](https://github.com/2060-io/vs-agent/issues/197)) ([aafd763](https://github.com/2060-io/vs-agent/commit/aafd763895449625e759b329350113b89044ab9a))
* update-release-please ([#179](https://github.com/2060-io/vs-agent/issues/179)) ([7caa09c](https://github.com/2060-io/vs-agent/commit/7caa09c0e9e1d5b642fdbb087e663f487b7e994b))
* vs-agent version ([#165](https://github.com/2060-io/vs-agent/issues/165)) ([94fb01d](https://github.com/2060-io/vs-agent/commit/94fb01d2a31a7394a98c5472eb28450dc7da8bfa))

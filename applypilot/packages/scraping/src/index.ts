import { LinkedInAdapter } from './adapters/linkedin.adapter.js';
import { NaukriAdapter } from './adapters/naukri.adapter.js';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter.js';
import { LeverAdapter } from './adapters/lever.adapter.js';
import { AshbyAdapter } from './adapters/ashby.adapter.js';
import { RemoteOKAdapter } from './adapters/remoteok.adapter.js';
import { ArbeitnowAdapter } from './adapters/arbeitnow.adapter.js';
import { YCAdapter } from './adapters/yc.adapter.js';
import { InternshalaAdapter } from './adapters/internshala.adapter.js';
import { UnstopAdapter } from './adapters/unstop.adapter.js';
import { defaultRegistry } from './registry.js';

// Register core production adapters
defaultRegistry.register(new LinkedInAdapter());
defaultRegistry.register(new NaukriAdapter());
defaultRegistry.register(new GreenhouseAdapter());
defaultRegistry.register(new LeverAdapter());
defaultRegistry.register(new AshbyAdapter());
defaultRegistry.register(new RemoteOKAdapter());
defaultRegistry.register(new ArbeitnowAdapter());
defaultRegistry.register(new YCAdapter());
defaultRegistry.register(new InternshalaAdapter());
defaultRegistry.register(new UnstopAdapter());

export * from './types.js';
export * from './registry.js';
export * from './adapters/linkedin.adapter.js';
export * from './adapters/naukri.adapter.js';
export * from './adapters/greenhouse.adapter.js';
export * from './adapters/lever.adapter.js';
export * from './adapters/ashby.adapter.js';
export * from './adapters/remoteok.adapter.js';
export * from './adapters/arbeitnow.adapter.js';
export * from './adapters/yc.adapter.js';
export * from './adapters/internshala.adapter.js';
export * from './adapters/unstop.adapter.js';

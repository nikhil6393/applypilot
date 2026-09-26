import { z } from 'zod';

export const SkillCategorySchema = z.enum([
  'language',
  'framework',
  'database',
  'cloud',
  'tooling',
  'testing',
  'domain',
  'soft_skill',
  'unknown',
]);

export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  normalizedName: z.string(),
  category: SkillCategorySchema.default('unknown'),
  aliases: z.array(z.string()).default([]),
  weight: z.number().min(0).max(100).default(50),
});

export type Skill = z.infer<typeof SkillSchema>;

export const SkillTaxonomyDictionary: Record<string, { category: SkillCategory; aliases: string[] }> = {
  javascript: { category: 'language', aliases: ['js', 'ecmascript', 'es6', 'vanilla js'] },
  typescript: { category: 'language', aliases: ['ts'] },
  python: { category: 'language', aliases: ['py', 'python3'] },
  java: { category: 'language', aliases: ['core java', 'java 8', 'java 11', 'java 17', 'java 21'] },
  golang: { category: 'language', aliases: ['go', 'go-lang'] },
  rust: { category: 'language', aliases: ['rs'] },
  cpp: { category: 'language', aliases: ['c++', 'cplusplus'] },
  csharp: { category: 'language', aliases: ['c#', '.net'] },
  react: { category: 'framework', aliases: ['reactjs', 'react.js', 'react 18', 'react 19'] },
  nextjs: { category: 'framework', aliases: ['next.js', 'next'] },
  vue: { category: 'framework', aliases: ['vuejs', 'vue.js', 'vue 3'] },
  angular: { category: 'framework', aliases: ['angularjs', 'angular 2+'] },
  nodejs: { category: 'framework', aliases: ['node.js', 'node'] },
  express: { category: 'framework', aliases: ['expressjs', 'express.js'] },
  fastapi: { category: 'framework', aliases: ['fast-api'] },
  django: { category: 'framework', aliases: ['django-rest-framework', 'drf'] },
  postgresql: { category: 'database', aliases: ['postgres', 'psql'] },
  mysql: { category: 'database', aliases: ['my-sql'] },
  mongodb: { category: 'database', aliases: ['mongo'] },
  redis: { category: 'database', aliases: ['valkey'] },
  sqlite: { category: 'database', aliases: ['sqlite3'] },
  aws: { category: 'cloud', aliases: ['amazon web services', 'ec2', 's3', 'lambda'] },
  azure: { category: 'cloud', aliases: ['microsoft azure'] },
  gcp: { category: 'cloud', aliases: ['google cloud', 'google cloud platform'] },
  docker: { category: 'tooling', aliases: ['containerization', 'containers'] },
  kubernetes: { category: 'tooling', aliases: ['k8s'] },
  git: { category: 'tooling', aliases: ['github', 'gitlab'] },
  vitest: { category: 'testing', aliases: ['vite-test'] },
  jest: { category: 'testing', aliases: ['jestjs'] },
  playwright: { category: 'testing', aliases: ['playwright-test'] },
  cypress: { category: 'testing', aliases: ['cypress.io'] },
};

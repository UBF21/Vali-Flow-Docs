import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import type { IconType } from 'react-icons';
import { SiDotnet, SiMongodb, SiElasticsearch, SiRedis, SiCouchbase, SiGooglecloud } from 'react-icons/si';
import { LuBrain, LuTestTube, LuDatabase, LuDatabaseZap, LuCloud } from 'react-icons/lu';

import styles from './index.module.css';

// ─── Feature data ────────────────────────────────────────────────────────────

interface Feature {
  icon: IconType;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: LuBrain,
    title: 'Vali-Flow.Core',
    description:
      'Dependency-free fluent builder for expression trees and in-memory validation.',
  },
  {
    icon: SiDotnet,
    title: 'Vali-Flow (EF Core)',
    description:
      'Wrap an expression in a Specification and run it against DbSet<T> with async evaluators.',
  },
  {
    icon: LuTestTube,
    title: 'Vali-Flow.InMemory',
    description:
      'Synchronous, zero-dependency evaluator for IEnumerable<T> — unit tests, caches, prototyping.',
  },
  {
    icon: LuDatabase,
    title: 'Vali-Flow.Sql',
    description:
      'Translate an expression into a parameterized SQL WHERE clause for Dapper or raw ADO.NET.',
  },
  {
    icon: SiMongodb,
    title: 'Vali-Flow.NoSql.MongoDB',
    description:
      'Translate an expression into a MongoDB BsonDocument filter.',
  },
  {
    icon: LuDatabaseZap,
    title: 'Vali-Flow.NoSql.DynamoDB',
    description:
      'Translate an expression into a DynamoDB FilterExpression for scans and queries.',
  },
  {
    icon: SiElasticsearch,
    title: 'Vali-Flow.NoSql.Elasticsearch',
    description:
      'Translate an expression into an Elasticsearch Query object.',
  },
  {
    icon: SiRedis,
    title: 'Vali-Flow.NoSql.Redis',
    description:
      'Translate an expression into a RediSearch query string.',
  },
  {
    icon: SiCouchbase,
    title: 'Vali-Flow.NoSql.Couchbase',
    description:
      'Translate an expression into a Couchbase N1QL WHERE clause fragment.',
  },
  {
    icon: LuCloud,
    title: 'Vali-Flow.NoSql.CosmosDb',
    description:
      'Translate an expression into an Azure Cosmos DB SQL API WHERE clause fragment.',
  },
  {
    icon: SiGooglecloud,
    title: 'Vali-Flow.NoSql.Firestore',
    description:
      'Translate an expression into a native Google.Cloud.Firestore Filter.',
  },
];

const FEATURES_ES: Feature[] = [
  {
    icon: LuBrain,
    title: 'Vali-Flow.Core',
    description:
      'Builder fluido sin dependencias para expression trees y validacion en memoria.',
  },
  {
    icon: SiDotnet,
    title: 'Vali-Flow (EF Core)',
    description:
      'Envuelve una expression en una Specification y ejecutala sobre DbSet<T> con evaluadores async.',
  },
  {
    icon: LuTestTube,
    title: 'Vali-Flow.InMemory',
    description:
      'Evaluador sincrono y sin dependencias para IEnumerable<T> — tests, cache, prototipado.',
  },
  {
    icon: LuDatabase,
    title: 'Vali-Flow.Sql',
    description:
      'Traduce una expression a una clausula SQL WHERE parametrizada para Dapper o ADO.NET.',
  },
  {
    icon: SiMongodb,
    title: 'Vali-Flow.NoSql.MongoDB',
    description:
      'Traduce una expression a un filtro BsonDocument de MongoDB.',
  },
  {
    icon: LuDatabaseZap,
    title: 'Vali-Flow.NoSql.DynamoDB',
    description:
      'Traduce una expression a un FilterExpression de DynamoDB para scans y queries.',
  },
  {
    icon: SiElasticsearch,
    title: 'Vali-Flow.NoSql.Elasticsearch',
    description:
      'Traduce una expression a un objeto Query de Elasticsearch.',
  },
  {
    icon: SiRedis,
    title: 'Vali-Flow.NoSql.Redis',
    description:
      'Traduce una expression a un query string de RediSearch.',
  },
  {
    icon: SiCouchbase,
    title: 'Vali-Flow.NoSql.Couchbase',
    description:
      'Traduce una expression a una clausula WHERE de Couchbase N1QL.',
  },
  {
    icon: LuCloud,
    title: 'Vali-Flow.NoSql.CosmosDb',
    description:
      'Traduce una expression a una clausula WHERE de Azure Cosmos DB SQL API.',
  },
  {
    icon: SiGooglecloud,
    title: 'Vali-Flow.NoSql.Firestore',
    description:
      'Traduce una expression a un Filter nativo de Google.Cloud.Firestore.',
  },
];

// ─── Package data ─────────────────────────────────────────────────────────────

interface Package {
  name: string;
  description: string;
  nuget: string;
}

const PACKAGES: Package[] = [
  { name: 'Vali-Flow',                     description: 'EF Core evaluator — wraps an expression in a Specification and reads/writes via DbSet<T>.', nuget: 'https://www.nuget.org/packages/Vali-Flow' },
  { name: 'Vali-Flow.Core',                description: 'Core builder for expression trees and in-memory validation.',              nuget: 'https://www.nuget.org/packages/Vali-Flow.Core' },
  { name: 'Vali-Flow.InMemory',            description: 'Synchronous evaluator for IEnumerable<T> — tests, caches, prototyping.',   nuget: 'https://www.nuget.org/packages/Vali-Flow.InMemory' },
  { name: 'Vali-Flow.Sql',                 description: 'Translates an expression into a parameterized SQL WHERE clause for Dapper/ADO.NET.', nuget: 'https://www.nuget.org/packages/Vali-Flow.Sql' },
  { name: 'Vali-Flow.NoSql.MongoDB',       description: 'Translates an expression into a MongoDB BsonDocument filter.',             nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.MongoDB' },
  { name: 'Vali-Flow.NoSql.DynamoDB',      description: 'Translates an expression into a DynamoDB FilterExpression.',               nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.DynamoDB' },
  { name: 'Vali-Flow.NoSql.Elasticsearch', description: 'Translates an expression into an Elasticsearch Query object.',             nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Elasticsearch' },
  { name: 'Vali-Flow.NoSql.Redis',         description: 'Translates an expression into a RediSearch query string.',                 nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Redis' },
  { name: 'Vali-Flow.NoSql.Couchbase',     description: 'Translates an expression into a Couchbase N1QL WHERE fragment + params.',   nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Couchbase' },
  { name: 'Vali-Flow.NoSql.CosmosDb',      description: 'Translates an expression into an Azure Cosmos DB SQL API WHERE fragment.',  nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.CosmosDb' },
  { name: 'Vali-Flow.NoSql.Firestore',     description: 'Translates an expression into a native Google.Cloud.Firestore Filter.',     nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Firestore' },
];

const PACKAGES_ES: Package[] = [
  { name: 'Vali-Flow',                     description: 'Evaluador EF Core — envuelve una expression en una Specification y lee/escribe via DbSet<T>.', nuget: 'https://www.nuget.org/packages/Vali-Flow' },
  { name: 'Vali-Flow.Core',                description: 'Builder core para expression trees y validacion en memoria.',              nuget: 'https://www.nuget.org/packages/Vali-Flow.Core' },
  { name: 'Vali-Flow.InMemory',            description: 'Evaluador sincrono para IEnumerable<T> — tests, cache, prototipado.',      nuget: 'https://www.nuget.org/packages/Vali-Flow.InMemory' },
  { name: 'Vali-Flow.Sql',                 description: 'Traduce una expression a una clausula SQL WHERE parametrizada para Dapper/ADO.NET.', nuget: 'https://www.nuget.org/packages/Vali-Flow.Sql' },
  { name: 'Vali-Flow.NoSql.MongoDB',       description: 'Traduce una expression a un filtro BsonDocument de MongoDB.',              nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.MongoDB' },
  { name: 'Vali-Flow.NoSql.DynamoDB',      description: 'Traduce una expression a un FilterExpression de DynamoDB.',                nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.DynamoDB' },
  { name: 'Vali-Flow.NoSql.Elasticsearch', description: 'Traduce una expression a un objeto Query de Elasticsearch.',               nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Elasticsearch' },
  { name: 'Vali-Flow.NoSql.Redis',         description: 'Traduce una expression a un query string de RediSearch.',                  nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Redis' },
  { name: 'Vali-Flow.NoSql.Couchbase',     description: 'Traduce una expression a una clausula WHERE de Couchbase N1QL + params.',    nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Couchbase' },
  { name: 'Vali-Flow.NoSql.CosmosDb',      description: 'Traduce una expression a una clausula WHERE de Azure Cosmos DB SQL API.',    nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.CosmosDb' },
  { name: 'Vali-Flow.NoSql.Firestore',     description: 'Traduce una expression a un Filter nativo de Google.Cloud.Firestore.',       nuget: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Firestore' },
];


// ─── Translations ─────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    heroBadge: 'Expression trees · translators · analyzers',
    heroTagline: 'one expression. many backends.',
    heroSubtitle: 'Build fluent rules once. Execute across 10 stores — EF Core, SQL, MongoDB, DynamoDB, Elasticsearch, Redis, Couchbase, Cosmos DB, Firestore or InMemory.',
    heroModulesLabel: 'Available evaluators',
    statModules: 'packages',
    statCountries: 'stores',
    statSupported: 'core deps',
    ctaGetStarted: 'Get started →',
    ctaReadDocs: 'Read the docs',
    featuresSectionTitle: 'Expressions that travel with your data',
    featuresSectionSubtitle: 'A single fluent expression becomes LINQ, SQL, NoSQL queries or in-memory checks.',
    pipelineBadge: 'expression pipeline',
    pipelineTitle: 'Build → translate → execute',
    pipelineSubtitle: 'Core builds the expression tree. Evaluators translate it to the store you run.',
    packagesSectionTitle: '11 NuGet packages. Install only what you need.',
    packagesSectionSubtitle: 'Start with Core, add one evaluator, or mix multiple stores.',
    useCasesTitle: 'Where Vali-Flow fits best',
    useCasesSubtitle: 'Compose rules once, keep behavior consistent across services and storage layers.',
    useCase1Title: 'Repository Filters',
    useCase1Desc: 'Build expressions in the application layer and run them inside EF Core or raw SQL repos.',
    useCase2Title: 'Cross-Store Consistency',
    useCase2Desc: 'Use the same expression across all 7 NoSQL stores — MongoDB, DynamoDB, Elasticsearch, Redis, Couchbase, Cosmos DB, Firestore.',
    useCase3Title: 'Testing & Validation',
    useCase3Desc: 'Run expressions in memory to validate domain rules in fast unit tests.',
    authorBuiltBy: 'Built by',
    authorBio: '.NET developer and open-source contributor. Also the author of',
    seoTitle: 'Vali-Flow — One expression tree. Many evaluators.',
    seoDesc: 'Modular .NET ecosystem for building ValiFlow expression trees and executing them across EF Core, SQL, MongoDB, DynamoDB, Elasticsearch, Redis, Couchbase, Cosmos DB, Firestore and InMemory.',
    codeComment: '// Build the expression tree',
    codeCommentEf: '// Apply it directly with EF Core',
    codeCommentDi: '// Register the evaluator (resolves a scoped DbContext)',
    codeCommentSpec: '// Wrap the filter in a real Specification',
    codeCommentMaterialize: '// IQueryable<T> is lazy — ToListAsync() is what hits the database',
    codeTabBuilder: 'Builder only',
    codeTabEvaluator: 'Builder + Evaluator',
    copyAriaLabel: 'Copy code',
    copyToClipboard: 'Copy to clipboard',
  },
  es: {
    heroBadge: 'Expression trees · traductores · analyzers',
    heroTagline: 'una expression. muchos backends.',
    heroSubtitle: 'Construye reglas una vez. Ejecuta en 10 stores — EF Core, SQL, MongoDB, DynamoDB, Elasticsearch, Redis, Couchbase, Cosmos DB, Firestore o InMemory.',
    heroModulesLabel: 'Evaluadores disponibles',
    statModules: 'paquetes',
    statCountries: 'stores',
    statSupported: 'deps core',
    ctaGetStarted: 'Comenzar →',
    ctaReadDocs: 'Leer la documentación',
    featuresSectionTitle: 'Expressions que viajan con tus datos',
    featuresSectionSubtitle: 'Una sola expression se convierte en LINQ, SQL, NoSQL o checks in-memory.',
    pipelineBadge: 'pipeline de expressions',
    pipelineTitle: 'Construye → traduce → ejecuta',
    pipelineSubtitle: 'Core construye el arbol de expresiones. Los evaluadores lo traducen al store.',
    packagesSectionTitle: '11 paquetes NuGet. Instala solo lo que necesitas.',
    packagesSectionSubtitle: 'Empieza con Core, agrega un evaluador o combina varios stores.',
    useCasesTitle: 'Donde Vali-Flow encaja mejor',
    useCasesSubtitle: 'Compone reglas una vez y mantén el comportamiento consistente en tus capas.',
    useCase1Title: 'Filtros de repositorio',
    useCase1Desc: 'Construye expressions en la capa de aplicación y ejecútalas en EF Core o SQL.',
    useCase2Title: 'Consistencia multi-store',
    useCase2Desc: 'Usa la misma expression en los 7 stores NoSQL — MongoDB, DynamoDB, Elasticsearch, Redis, Couchbase, Cosmos DB, Firestore.',
    useCase3Title: 'Testing y validación',
    useCase3Desc: 'Ejecuta expressions in-memory para validar reglas en tests rápidos.',
    authorBuiltBy: 'Desarrollado por',
    authorBio: 'Desarrollador .NET y contribuidor de codigo abierto. Tambien autor de',
    seoTitle: 'Vali-Flow — Una expression. Muchos evaluadores.',
    seoDesc: 'Ecosistema modular .NET para construir expressions y ejecutarlas en EF Core, SQL, MongoDB, DynamoDB, Elasticsearch, Redis e InMemory.',
    codeComment: '// Construye una expression',
    codeCommentEf: '// Aplicala directamente con EF Core',
    codeCommentDi: '// Registra el evaluador (resuelve un DbContext scoped)',
    codeCommentSpec: '// Envuelve el filtro en una Specification real',
    codeCommentMaterialize: '// IQueryable<T> es lazy — ToListAsync() es lo que llega a la base de datos',
    codeTabBuilder: 'Solo builder',
    codeTabEvaluator: 'Builder + Evaluator',
    copyAriaLabel: 'Copiar código',
    copyToClipboard: 'Copiar al portapapeles',
  },
} as const;

type Locale = keyof typeof TRANSLATIONS;
function useT() {
  const { i18n } = useDocusaurusContext();
  const locale = (i18n.currentLocale === 'es' ? 'es' : 'en') as Locale;
  return { t: TRANSLATIONS[locale], locale };
}

// ─── Canvas particle system ───────────────────────────────────────────────────

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      color: string;
      alpha: number;
    }

    const COLORS = ['rgba(79,70,229,', 'rgba(167,139,250,', 'rgba(249,115,22,'];
    let particles: Particle[] = [];

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function spawn(): Particle {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        color: c,
        alpha: Math.random() * 0.5 + 0.2,
      };
    }

    function init() {
      const count = Math.floor((w * h) / 8000);
      particles = Array.from({ length: Math.min(count, 90) }, spawn);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const opacity = (1 - dist / 120) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79,70,229,${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `${p.color}${p.alpha})`);
        grad.addColorStop(1, `${p.color}0)`);
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.fillStyle = `${p.color}${p.alpha + 0.3})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();

    const ro = new ResizeObserver(() => { resize(); init(); });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [canvasRef]);
}

// ─── Syntax-highlighted C# code ──────────────────────────────────────────────

type Token = { text: string; cls: string };

const EXPRESSION_ROWS: Token[][] = [
  [{ text: 'var', cls: 'cKw' }, { text: ' expression ', cls: 'cPunc' }, { text: '=', cls: 'cPunc' }, { text: ' new ', cls: 'cPunc' }, { text: 'ValiFlow', cls: 'cType' }, { text: '<', cls: 'cPunc' }, { text: 'Product', cls: 'cType' }, { text: '>()', cls: 'cPunc' }],
  [{ text: '    .', cls: 'cPunc' }, { text: 'EqualTo', cls: 'cMethod' }, { text: '(', cls: 'cPunc' }, { text: 'p', cls: 'cVar' }, { text: ' => ', cls: 'cPunc' }, { text: 'p', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'IsActive', cls: 'cProp' }, { text: ', ', cls: 'cPunc' }, { text: 'true', cls: 'cKw' }, { text: ')', cls: 'cPunc' }],
  [{ text: '    .', cls: 'cPunc' }, { text: 'GreaterThan', cls: 'cMethod' }, { text: '(', cls: 'cPunc' }, { text: 'p', cls: 'cVar' }, { text: ' => ', cls: 'cPunc' }, { text: 'p', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'Price', cls: 'cProp' }, { text: ', ', cls: 'cPunc' }, { text: '10m', cls: 'cNum' }, { text: ');', cls: 'cPunc' }],
];

const EXPRESSION_RAW = `var expression = new ValiFlow<Product>()
    .EqualTo(p => p.IsActive, true)
    .GreaterThan(p => p.Price, 10m);`;

const BUILDER_ONLY_ROWS: Token[][] = [
  [{ text: 'var', cls: 'cKw' }, { text: ' result ', cls: 'cPunc' }, { text: '=', cls: 'cPunc' }, { text: ' await ', cls: 'cPunc' }, { text: 'dbContext', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'Products', cls: 'cProp' }],
  [{ text: '    .', cls: 'cPunc' }, { text: 'Where', cls: 'cMethod' }, { text: '(', cls: 'cPunc' }, { text: 'expression', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'Build', cls: 'cMethod' }, { text: '())', cls: 'cPunc' }],
  [{ text: '    .', cls: 'cPunc' }, { text: 'ToListAsync', cls: 'cMethod' }, { text: '();', cls: 'cPunc' }],
];
const BUILDER_ONLY_RAW = `var result = await dbContext.Products
    .Where(expression.Build())
    .ToListAsync();`;

// Real registration: a typed ValiFlowEvaluator<T> resolved from DI, not a magic extension method
const EVALUATOR_SETUP_ROWS: Token[][] = [
  [
    { text: 'builder', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'Services', cls: 'cType' }, { text: '.', cls: 'cPunc' },
    { text: 'AddScoped', cls: 'cMethod' }, { text: '<', cls: 'cPunc' }, { text: 'ValiFlowEvaluator', cls: 'cType' }, { text: '<', cls: 'cPunc' }, { text: 'Product', cls: 'cType' }, { text: '>>(', cls: 'cPunc' }, { text: 'sp', cls: 'cVar' }, { text: ' => ', cls: 'cPunc' },
  ],
  [
    { text: '    new ', cls: 'cPunc' }, { text: 'ValiFlowEvaluator', cls: 'cType' }, { text: '<', cls: 'cPunc' }, { text: 'Product', cls: 'cType' }, { text: '>(', cls: 'cPunc' },
    { text: 'sp', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'GetRequiredService', cls: 'cMethod' }, { text: '<', cls: 'cPunc' }, { text: 'AppDbContext', cls: 'cType' }, { text: '>());', cls: 'cPunc' },
  ],
];
const EVALUATOR_SETUP_RAW = `builder.Services.AddScoped<ValiFlowEvaluator<Product>>(sp =>
    new ValiFlowEvaluator<Product>(sp.GetRequiredService<AppDbContext>()));`;

// The expression is just a filter — EvaluateQueryAsync needs it wrapped in a real Specification
const SPEC_WRAP_ROW: Token[] = [
  { text: 'var', cls: 'cKw' }, { text: ' spec ', cls: 'cPunc' }, { text: '=', cls: 'cPunc' }, { text: ' new ', cls: 'cPunc' }, { text: 'QuerySpecification', cls: 'cType' }, { text: '<', cls: 'cPunc' }, { text: 'Product', cls: 'cType' }, { text: '>()', cls: 'cPunc' }, { text: '.', cls: 'cPunc' }, { text: 'WithFilter', cls: 'cMethod' }, { text: '(', cls: 'cPunc' }, { text: 'expression', cls: 'cVar' }, { text: ');', cls: 'cPunc' },
];
const SPEC_WRAP_RAW = 'var spec = new QuerySpecification<Product>().WithFilter(expression);';

// EvaluateQueryAsync returns IQueryable<T> (lazy) — ToListAsync is what actually hits the database
const EVALUATOR_CALL_ROWS: Token[][] = [
  [{ text: 'var', cls: 'cKw' }, { text: ' query ', cls: 'cPunc' }, { text: '=', cls: 'cPunc' }, { text: ' await ', cls: 'cPunc' }, { text: 'evaluator', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'EvaluateQueryAsync', cls: 'cMethod' }, { text: '(', cls: 'cPunc' }, { text: 'spec', cls: 'cVar' }, { text: ');', cls: 'cPunc' }],
  [{ text: 'var', cls: 'cKw' }, { text: ' result ', cls: 'cPunc' }, { text: '=', cls: 'cPunc' }, { text: ' await ', cls: 'cPunc' }, { text: 'query', cls: 'cVar' }, { text: '.', cls: 'cPunc' }, { text: 'ToListAsync', cls: 'cMethod' }, { text: '();', cls: 'cPunc' }],
];
const EVALUATOR_CALL_RAW = `var query = await evaluator.EvaluateQueryAsync(spec);
var result = await query.ToListAsync();`;

type CodeTab = 'builder' | 'evaluator';
type TFn = ReturnType<typeof useT>['t'];

// Shared "build the expression" step; step 2 differs per tab (manual EF Core vs. registered evaluator)
function getTabTokens(tab: CodeTab, t: TFn): Token[][] {
  if (tab === 'builder') {
    return [
      [{ text: t.codeComment, cls: 'cComment' }],
      ...EXPRESSION_ROWS,
      [],
      [{ text: t.codeCommentEf, cls: 'cComment' }],
      ...BUILDER_ONLY_ROWS,
    ];
  }
  return [
    [{ text: t.codeCommentDi, cls: 'cComment' }],
    ...EVALUATOR_SETUP_ROWS,
    [],
    [{ text: t.codeComment, cls: 'cComment' }],
    ...EXPRESSION_ROWS,
    [],
    [{ text: t.codeCommentSpec, cls: 'cComment' }],
    SPEC_WRAP_ROW,
    [],
    [{ text: t.codeCommentMaterialize, cls: 'cComment' }],
    ...EVALUATOR_CALL_ROWS,
  ];
}

function getTabRaw(tab: CodeTab, t: TFn): string {
  if (tab === 'builder') {
    return `${t.codeComment}\n${EXPRESSION_RAW}\n\n${t.codeCommentEf}\n${BUILDER_ONLY_RAW}`;
  }
  return `${t.codeCommentDi}\n${EVALUATOR_SETUP_RAW}\n\n${t.codeComment}\n${EXPRESSION_RAW}\n\n${t.codeCommentSpec}\n${SPEC_WRAP_RAW}\n\n${t.codeCommentMaterialize}\n${EVALUATOR_CALL_RAW}`;
}

function CodeTabSwitcher({ tab, onChange, t }: { tab: CodeTab; onChange: (t: CodeTab) => void; t: TFn }): ReactNode {
  return (
    <div className={styles.codeTabs} role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'builder'}
        className={clsx(styles.codeTab, tab === 'builder' && styles.codeTabActive)}
        onClick={() => onChange('builder')}>
        {t.codeTabBuilder}
      </button>
      <button type="button" role="tab" aria-selected={tab === 'evaluator'}
        className={clsx(styles.codeTab, tab === 'evaluator' && styles.codeTabActive)}
        onClick={() => onChange('evaluator')}>
        {t.codeTabEvaluator}
      </button>
    </div>
  );
}

function CodeCopyButton({ raw, ariaLabel }: { raw: string; ariaLabel: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => console.error('[CodeBlock] clipboard write failed', err));
  };
  return (
    <button className={styles.codeCopyBtn} onClick={onCopy} aria-label={ariaLabel}>
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function CodeLines({ tokens }: { tokens: Token[][] }): ReactNode {
  return (
    <div className={styles.codeBody}>
      <div className={styles.codeLineNumbers}>
        {tokens.map((_, i) => (
          <span key={i} className={styles.codeLineNum}>{i + 1}</span>
        ))}
      </div>
      <pre className={styles.codePre}>
        <code>
          {tokens.map((line, li) => (
            <div key={li} className={styles.codeLine}>
              {line.map((tok, ti) => (
                <span key={ti} className={styles[tok.cls]}>{tok.text}</span>
              ))}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

function CodeBlock(): ReactNode {
  const [tab, setTab] = useState<CodeTab>('builder');
  const { t } = useT();
  const tokens = getTabTokens(tab, t);
  const raw = getTabRaw(tab, t);

  return (
    <div className={styles.codeCard}>
      <CodeTabSwitcher tab={tab} onChange={setTab} t={t} />
      <div className={styles.codeChrome}>
        <span className={styles.chromeDot} data-color="red" />
        <span className={styles.chromeDot} data-color="yellow" />
        <span className={styles.chromeDot} data-color="green" />
        <span className={styles.codeFile}>Program.cs</span>
        <CodeCopyButton raw={raw} ariaLabel={t.copyAriaLabel} />
      </div>
      <CodeLines tokens={tokens} />
      <div className={styles.codeGlowBar} />
    </div>
  );
}

// ─── Live Clock Panel ─────────────────────────────────────────────────────────

function ExpressionFlowPanel(): ReactNode {
  const API_CARDS = [
    {
      module: 'Vali-Flow.Core',
      icon: LuBrain,
      call: 'new ValiFlow<Product>()',
      result: 'expression built',
      live: false,
    },
    {
      module: 'Vali-Flow (EF Core)',
      icon: SiDotnet,
      call: 'evaluator.EvaluateQueryAsync(spec)',
      result: 'IQueryable<Product>',
      live: false,
    },
    {
      module: 'Vali-Flow.Sql',
      icon: LuDatabase,
      call: 'expression.ToSql(dialect)',
      result: '"WHERE price > @p0"',
      live: false,
    },
    {
      module: 'Vali-Flow.InMemory',
      icon: LuTestTube,
      call: 'evaluator.Evaluate(entity, expression)',
      result: 'true',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.MongoDB',
      icon: SiMongodb,
      call: 'expression.ToMongo()',
      result: '{ price: { $gt: 10 } }',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.DynamoDB',
      icon: LuDatabaseZap,
      call: 'expression.ToDynamoDB()',
      result: 'price > :v0',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.Elasticsearch',
      icon: SiElasticsearch,
      call: 'expression.ToElasticsearch()',
      result: '{ range: { price: { gt: 10 }}}',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.Redis',
      icon: SiRedis,
      call: 'expression.ToRedisSearch()',
      result: '@price:[10 +inf]',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.Couchbase',
      icon: SiCouchbase,
      call: 'expression.ToCouchbase()',
      result: 'price > $p0',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.CosmosDb',
      icon: LuCloud,
      call: 'expression.ToCosmosDb()',
      result: 'c.price > @p0',
      live: false,
    },
    {
      module: 'Vali-Flow.NoSql.Firestore',
      icon: SiGooglecloud,
      call: 'expression.ToFirestore()',
      result: 'Filter.GreaterThan(...)',
      live: false,
    },
  ];

  return (
    <div className={styles.flowPanel}>
      {/* Expression flow diagram */}
      <div className={styles.flowDiagram} aria-label="Expression flow diagram">
        <div className={styles.flowRow}>
          <div className={styles.flowNode}>
            <span className={styles.flowNodeTitle}>Expression</span>
            <span className={styles.flowNodeMeta}>ValiFlow&lt;T&gt;</span>
          </div>
          <div className={styles.flowArrow} />
          <div className={styles.flowNode}>
            <span className={styles.flowNodeTitle}>Core</span>
            <span className={styles.flowNodeMeta}>Expression Tree</span>
          </div>
          <div className={styles.flowArrow} />
          <div className={styles.flowNode}>
            <span className={styles.flowNodeTitle}>Translator</span>
            <span className={styles.flowNodeMeta}>EF / SQL / NoSQL</span>
          </div>
        </div>

        <div className={styles.flowRow}>
          <div className={styles.flowNodeAlt}>
            <span className={styles.flowNodeTitle}>Evaluator</span>
            <span className={styles.flowNodeMeta}>EvaluateQueryAsync / Evaluate</span>
          </div>
          <div className={styles.flowArrowAlt} />
          <div className={styles.flowNodeAlt}>
            <span className={styles.flowNodeTitle}>Store</span>
            <span className={styles.flowNodeMeta}>EF Core · SQL · Mongo</span>
          </div>
          <div className={styles.flowArrowAlt} />
          <div className={styles.flowNodeAlt}>
            <span className={styles.flowNodeTitle}>Result</span>
            <span className={styles.flowNodeMeta}>Rows / Matches</span>
          </div>
        </div>
      </div>

      {/* API grid */}
      <div className={styles.apiGrid}>
        {API_CARDS.map((card) => (
          <div key={card.module} className={styles.apiCard}>
            <div className={styles.apiCardHeader}>
              <span className={styles.apiCardIcon}><card.icon size="1em" aria-hidden="true" /></span>
              <span className={styles.apiCardModule}>{card.module}</span>
              {card.live && <span className={styles.apiCardLiveDot} />}
            </div>
            <code className={styles.apiCardCall}>{card.call}</code>
            <div className={styles.apiCardResult}>{card.result}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Module Ecosystem Section (premium animated) ──────────────────────────────

function ModuleSection(): ReactNode {
  const { t } = useT();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  useParticles(canvasRef as React.RefObject<HTMLCanvasElement>);

  // GSAP entrance animation on scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let gsapMod: typeof import('gsap') | null = null;

    import('gsap').then((mod) => {
      gsapMod = mod;
      const { gsap } = mod;

      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);

        if (!sectionRef.current) return;

        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
          }
        );

        gsap.fromTo(
          codeRef.current,
          { opacity: 0, x: 40 },
          {
            opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.3,
            scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
          }
        );
      }).catch(() => {
        gsap.fromTo(headerRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
        gsap.fromTo(codeRef.current, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.3 });
      });
    });

    return () => {
      if (gsapMod) {
        try {
          // @ts-ignore
          gsapMod.gsap?.globalTimeline?.clear();
        } catch { /* ignore */ }
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.pipelineSection}>
      {/* Particle canvas */}
      <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className={styles.pipelineCanvas} aria-hidden="true" />

      {/* Ambient glows */}
      <div className={styles.pipelineGlow1} aria-hidden="true" />
      <div className={styles.pipelineGlow2} aria-hidden="true" />

      <div className={clsx('container', styles.pipelineContainer)}>
        {/* Header */}
        <div ref={headerRef} className={clsx(styles.sectionHeader, styles.pipelineHeader)}>
          <div className={styles.pipelineBadge}>
            <span className={styles.pipelineBadgePulse} />
            {t.pipelineBadge}
          </div>
          <h2 className={styles.sectionTitle}>{t.pipelineTitle}</h2>
          <p className={styles.sectionSubtitle}>
            {t.pipelineSubtitle}
          </p>
        </div>

        {/* Top: flow diagram + api cards */}
        <ExpressionFlowPanel />

        {/* Bottom: code block */}
        <div ref={codeRef} className={styles.pipelineCodeCol}>
          <CodeBlock />
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, description, index }: Feature & { index: number }): ReactNode {
  const num = String(index + 1).padStart(2, '0');
  return (
    <div className={styles.featureCard}>
      <span className={styles.featureNumber}>{num}</span>
      <div className={styles.featureIconWrap}>
        <span className={styles.featureIconGlyph}><Icon size="1.25em" aria-hidden="true" /></span>
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={styles.copyButton}
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function PackageCard({ name, description, nuget }: Package): ReactNode {
  const installCommand = `dotnet add package ${name}`;
  return (
    <div className={styles.packageCard}>
      <div className={styles.packageAccent} aria-hidden="true" />
      <div className={styles.packageHeader}>
        <a href={nuget} target="_blank" rel="noopener noreferrer" className={styles.packageName}>
          <span className={styles.packageChip}>{name}</span>
        </a>
      </div>
      <p className={styles.packageDescription}>{description}</p>
      <div className={styles.packageInstall}>
        <code className={styles.packageInstallCode}>{installCommand}</code>
        <CopyButton text={installCommand} />
      </div>
    </div>
  );
}

// ─── Clock Ring Decoration ────────────────────────────────────────────────────

function ClockRingDecoration(): ReactNode {
  return (
    <div className={styles.clockRing} aria-hidden="true">
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Expression graph frame */}
        <rect x="52" y="52" width="296" height="296" rx="28" stroke="rgba(79,70,229,0.18)" strokeWidth="1.2" />
        <rect x="78" y="78" width="244" height="244" rx="22" stroke="rgba(16,185,129,0.16)" strokeWidth="1.1" />

        {/* Flow lines */}
        <path d="M120 200 H280" stroke="rgba(79,70,229,0.35)" strokeWidth="2" strokeLinecap="round" />
        <path d="M200 120 V280" stroke="rgba(16,185,129,0.28)" strokeWidth="2" strokeLinecap="round" />
        <path d="M140 140 L260 260" stroke="rgba(249,115,22,0.22)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M260 140 L140 260" stroke="rgba(139,92,246,0.22)" strokeWidth="1.6" strokeLinecap="round" />

        {/* Nodes */}
        <circle cx="120" cy="200" r="10" fill="rgba(79,70,229,0.9)" />
        <circle cx="200" cy="120" r="9" fill="rgba(16,185,129,0.9)" />
        <circle cx="280" cy="200" r="10" fill="rgba(249,115,22,0.9)" />
        <circle cx="200" cy="280" r="9" fill="rgba(139,92,246,0.9)" />

        {/* Outer dots */}
        <circle cx="90" cy="120" r="4" fill="rgba(79,70,229,0.45)" />
        <circle cx="310" cy="120" r="4" fill="rgba(16,185,129,0.45)" />
        <circle cx="310" cy="280" r="4" fill="rgba(249,115,22,0.45)" />
        <circle cx="90" cy="280" r="4" fill="rgba(139,92,246,0.45)" />
      </svg>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const MODULES = ['Core', 'EF Core', 'SQL', 'InMemory', 'MongoDB', 'DynamoDB', 'Elasticsearch', 'Redis', 'Couchbase', 'CosmosDb', 'Firestore'];

function Hero(): ReactNode {
  const [copied, setCopied] = useState(false);
  const { t } = useT();
  const installCmd = 'dotnet add package Vali-Flow';
  return (
    <section className={styles.hero}>
      {/* Radial circle grid background */}
      <div className={styles.heroGrid} aria-hidden="true" />
      <ClockRingDecoration />

      {/* Large floating orbs */}
      <div className={styles.heroOrb1} aria-hidden="true" />
      <div className={styles.heroOrb2} aria-hidden="true" />
      <div className={styles.heroOrb3} aria-hidden="true" />

      <div className={styles.heroInner}>
        {/* Badge */}
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgePulse} />
          <span className={styles.heroBadgeDot} />
          {t.heroBadge}
        </div>

        {/* Title */}
        <h1 className={styles.heroTitle}>Vali-Flow</h1>

        {/* Tagline */}
        <p className={styles.heroTagline}>
          <span className={styles.heroTaglineComment}>{'// '}</span>
          {t.heroTagline}
        </p>

        <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>

        {/* Module pills marquee */}
        <div className={styles.heroProviders} aria-label={t.heroModulesLabel}>
          <div className={styles.heroProvidersTrack}>
            {[...MODULES, ...MODULES].map((m, i) => (
              <span key={i} className={styles.providerPill}>{m}</span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>11</span>
            <span className={styles.heroStatLabel}>{t.statModules}</span>
          </div>
          <div className={styles.heroStatDivider} aria-hidden="true" />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>10</span>
            <span className={styles.heroStatLabel}>{t.statCountries}</span>
          </div>
          <div className={styles.heroStatDivider} aria-hidden="true" />
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>0 deps</span>
            <span className={styles.heroStatLabel}>{t.statSupported}</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className={styles.heroCta}>
          <Link className={clsx('button', styles.btnPrimary)} to="/docs/quick-start">{t.ctaGetStarted}</Link>
          <Link className={clsx('button', styles.btnSecondary)} to="/docs/introduction">{t.ctaReadDocs}</Link>
        </div>

        {/* Install block */}
        <div className={styles.heroInstallWrap}>
          <div className={styles.heroInstall}>
            <span className={styles.heroInstallPrompt}>$</span>
            <code className={styles.heroInstallCode}>{installCmd}</code>
            <button
              className={styles.heroInstallCopy}
              onClick={() => {
                navigator.clipboard.writeText(installCmd).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              aria-label={t.copyToClipboard}
            >
              {copied
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features section ─────────────────────────────────────────────────────────

function FeaturesSection(): ReactNode {
  const { t, locale } = useT();
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.featuresSectionTitle}</h2>
          <p className={styles.sectionSubtitle}>{t.featuresSectionSubtitle}</p>
        </div>
        <div className={styles.featuresGrid}>
          {(locale === 'es' ? FEATURES_ES : FEATURES).map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Packages section ─────────────────────────────────────────────────────────

function PackagesSection(): ReactNode {
  const { t, locale } = useT();
  return (
    <section className={styles.packagesSection}>
      <div className={styles.packagesDivider} aria-hidden="true" />
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.packagesSectionTitle}</h2>
          <p className={styles.sectionSubtitle}>{t.packagesSectionSubtitle}</p>
        </div>
        <div className={styles.packagesGrid}>
          {(locale === 'es' ? PACKAGES_ES : PACKAGES).map((p) => <PackageCard key={p.name} {...p} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Use Cases section ───────────────────────────────────────────────────────

function UseCasesSection(): ReactNode {
  const { t } = useT();
  return (
    <section className={styles.useCasesSection}>
      <div className={styles.useCasesGlow} aria-hidden="true" />
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.useCasesTitle}</h2>
          <p className={styles.sectionSubtitle}>{t.useCasesSubtitle}</p>
        </div>
        <div className={styles.useCasesGrid}>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseTag}>REPOS</div>
            <h3 className={styles.useCaseTitle}>{t.useCase1Title}</h3>
            <p className={styles.useCaseDesc}>{t.useCase1Desc}</p>
            <code className={styles.useCaseCode}>EvaluateQueryAsync(spec)</code>
          </div>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseTag}>MULTI-STORE</div>
            <h3 className={styles.useCaseTitle}>{t.useCase2Title}</h3>
            <p className={styles.useCaseDesc}>{t.useCase2Desc}</p>
            <code className={styles.useCaseCode}>ToMongo / ToElasticsearch / ToSql</code>
          </div>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseTag}>TESTS</div>
            <h3 className={styles.useCaseTitle}>{t.useCase3Title}</h3>
            <p className={styles.useCaseDesc}>{t.useCase3Desc}</p>
            <code className={styles.useCaseCode}>Evaluate(entity, expression)</code>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

const SEO_DESC  = 'Modular .NET ecosystem for building ValiFlow expression trees and executing them across EF Core, SQL, MongoDB, DynamoDB, Elasticsearch, Redis, Couchbase, Cosmos DB, Firestore and InMemory.';
const SEO_URL   = 'https://vali-flow.github.io';
const SEO_IMAGE = `${SEO_URL}/img/docusaurus-social-card.jpg`;

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const { t } = useT();
  return (
    <>
      <Head>
        {/* Primary */}
        <title>{t.seoTitle}</title>
        <meta name="description" content={t.seoDesc} />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#4F46E5" />
        <link rel="canonical" href={SEO_URL} />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content={SEO_URL} />
        <meta property="og:title"       content={t.seoTitle} />
        <meta property="og:description" content={t.seoDesc} />
        <meta property="og:image"       content={SEO_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale"          content="en_US" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:site_name" content="Vali-Flow" />

        {/* Twitter / X */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={t.seoTitle} />
        <meta name="twitter:description" content={t.seoDesc} />
        <meta name="twitter:image"       content={SEO_IMAGE} />

        {/* hreflang i18n */}
        <link rel="alternate" hrefLang="en" href={SEO_URL} />
        <link rel="alternate" hrefLang="es" href={`${SEO_URL}/es/`} />
        <link rel="alternate" hrefLang="x-default" href={SEO_URL} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Vali-Flow",
          "description": SEO_DESC,
          "url": SEO_URL,
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": ".NET 6, .NET 7, .NET 8, .NET 9",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "author": {
            "@type": "Organization",
            "name": "UBF21",
            "url": "https://github.com/UBF21"
          }
        })}</script>
      </Head>

      <Layout title={siteConfig.title} description={t.seoDesc}>
        <Hero />
        <main>
          <FeaturesSection />
          <ModuleSection />
          <PackagesSection />
          <UseCasesSection />
        </main>
      </Layout>
    </>
  );
}

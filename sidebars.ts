import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'introduction',
    'quick-start',
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/vali-flow',
        'examples/vali-flow-evaluator',
      ],
    },
    {
      type: 'category',
      label: 'Core',
      collapsed: false,
      items: [
        'core/getting-started',
        'core/comparison-boolean',
        'core/string',
        'core/numeric',
        'core/collection',
        'core/datetime',
        'core/valiflow-query',
        'core/advanced',
        {
          type: 'category',
          label: 'Core Guides',
          items: [
            'core/guides/getting-started',
            'core/guides/adding-new-methods',
            'core/guides/validation-with-errors',
          ],
        },
        {
          type: 'category',
          label: 'Core Architecture',
          items: [
            'core/architecture/overview',
            'core/architecture/base-expression',
            'core/architecture/facade-composition',
            'core/architecture/expression-trees',
            'core/architecture/source-generator',
            'core/architecture/ef-core-safety',
            'core/architecture/design-patterns',
          ],
        },
        {
          type: 'category',
          label: 'Core Internals',
          items: [
            'core/internals/condition-entry',
            'core/internals/thread-safety',
            'core/internals/expression-visitors',
            'core/internals/valiflowglobal-valisort',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Evaluators',
      collapsed: false,
      items: [
        'adapters/ef-core',
        'adapters/inmemory',
        {
          type: 'category',
          label: 'SQL',
          items: [
            'adapters/sql/overview',
            'adapters/sql/dialects',
            'adapters/sql/extensions',
            'adapters/sql/sql-result',
            'adapters/sql/query-builder',
            'adapters/sql/insert-builder',
            'adapters/sql/update-builder',
            'adapters/sql/delete-builder',
            'adapters/sql/truncate-builder',
            'adapters/sql/merge-builder',
          ],
        },
        {
          type: 'category',
          label: 'NoSQL',
          items: [
            {
              type: 'category',
              label: 'MongoDB',
              items: [
                'adapters/nosql/mongodb/overview',
                'adapters/nosql/mongodb/reference',
                'adapters/nosql/mongodb/limitations',
              ],
            },
            {
              type: 'category',
              label: 'DynamoDB',
              items: [
                'adapters/nosql/dynamodb/overview',
                'adapters/nosql/dynamodb/reference',
                'adapters/nosql/dynamodb/limitations',
              ],
            },
            {
              type: 'category',
              label: 'Elasticsearch',
              items: [
                'adapters/nosql/elasticsearch/overview',
                'adapters/nosql/elasticsearch/reference',
                'adapters/nosql/elasticsearch/limitations',
              ],
            },
            {
              type: 'category',
              label: 'Redis',
              items: [
                'adapters/nosql/redis/overview',
                'adapters/nosql/redis/reference',
                'adapters/nosql/redis/limitations',
              ],
            },
            {
              type: 'category',
              label: 'Couchbase',
              items: [
                'adapters/nosql/couchbase/overview',
                'adapters/nosql/couchbase/reference',
                'adapters/nosql/couchbase/limitations',
              ],
            },
            {
              type: 'category',
              label: 'CosmosDb',
              items: [
                'adapters/nosql/cosmosdb/overview',
                'adapters/nosql/cosmosdb/reference',
                'adapters/nosql/cosmosdb/limitations',
              ],
            },
            {
              type: 'category',
              label: 'Firestore',
              items: [
                'adapters/nosql/firestore/overview',
                'adapters/nosql/firestore/reference',
                'adapters/nosql/firestore/limitations',
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/combining-packages',
        'guides/testing-with-inmemory',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/design-decisions',
      ],
    },
    {
      type: 'category',
      label: 'Internal',
      items: [
        'internal/contributing',
        'internal/benchmarks',
      ],
    },
    {
      type: 'category',
      label: 'Changelog',
      items: [
        'changelog/index',
        'changelog/vali-flow-core',
        'changelog/vali-flow',
        'changelog/vali-flow-inmemory',
        'changelog/vali-flow-sql',
        'changelog/vali-flow-nosql',
        {
          type: 'category',
          label: 'NoSQL Adapters',
          items: [
            'changelog/vali-flow-nosql-mongodb',
            'changelog/vali-flow-nosql-dynamodb',
            'changelog/vali-flow-nosql-elasticsearch',
            'changelog/vali-flow-nosql-redis',
            'changelog/vali-flow-nosql-couchbase',
            'changelog/vali-flow-nosql-cosmosdb',
            'changelog/vali-flow-nosql-firestore',
          ],
        },
      ],
    },
  ],
};

export default sidebars;

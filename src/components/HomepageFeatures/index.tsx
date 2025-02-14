import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    Svg: require('@site/static/img/draw_seccion_principal_1.svg').default,
    description: (
      <>
        Vali-Flow is designed to seamlessly integrate into your projects, allowing you to define validations with a clear and fluent syntax.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    Svg: require('@site/static/img/draw_seccion_principal_2.svg').default,
    description: (
      <>
        Focus on your business logic without worrying about repetitive validations or unnecessary code.
      </>
    ),
  },
  {
    title: 'Powered by .NET',
    Svg: require('@site/static/img/draw_seccion_principal_3.svg').default,
    description: (
      <>
        Leverage the power of .NET to build robust and secure validations with optimal performance.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features} style={{marginTop:"60px"}}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

import { SpecificationsTable } from '@/types/products';
import { useTranslations } from 'next-intl';

type ProductFeaturesProps = {
  specificationsTable: SpecificationsTable
  /**
   * Spec values by their language-neutral key. Every lookup below used to
   * go through `specificationsTable['Energy Saving']` — an English label
   * against a map that is keyed in Arabic on the Arabic page, so all six
   * found nothing and the sentences rendered with holes. Worse,
   * `parseInt(undefined)` is NaN, and `NaN >= 44` is false, so an IP65
   * outdoor fixture described itself as indoor-only in Arabic.
   */
  specs?: Record<string, string>
  /** The same values as numbers, for the comparisons. */
  specNumbers?: Record<string, number>
};

export default function ProductFeatures({
  specificationsTable,
  specs,
  specNumbers,
}: ProductFeaturesProps) {
  const t = useTranslations('productFeatures');

  /** The key first; the old localized label only for a product with no structured specs. */
  const value = (key: string, englishLabel: string): string =>
    specs?.[key] ?? specificationsTable[englishLabel] ?? '';

  // The stored number, not the rendered string: "٤٤" does not parse.
  const ipRating = specNumbers?.ip ?? Number.parseInt(specificationsTable['IP'] ?? '', 10);
  const isWeatherproof = Number.isFinite(ipRating) && ipRating >= 44;

  return (
    <div className="mt-6">
      <h2 className="sm:text-2xl text-xl font-semibold mb-3">{t('title')}</h2>
      <ul>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('energy.title')} </strong>
          {t('energy.desc', { saving: value('energySaving', 'Energy Saving') })}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('lifetime.title')} </strong>
          {t('lifetime.desc', { lifetime: value('lifeTime', 'Life Time') })}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          {isWeatherproof
            ? <strong>{t('weatherproof.title')}</strong>
            : <strong>{t('indoor.title')}</strong>
          }
          {isWeatherproof
            ? t('weatherproof.desc', { ip: value('ip', 'IP') })
            : t('indoor.desc', { ip: value('ip', 'IP') })
          }
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('brightness.title')}</strong>
          {t('brightness.desc', { lumens: value('luminousFlux', 'Luminous Flux') })}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('beam.title')}</strong>
          {t('beam.desc', { angle: value('beamAngle', 'Beam Angle') })}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('temperature.title')}</strong>
          {t('temperature.desc', { range: value('workingTemperature', 'Working Temperature') })}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('cri.title')}</strong>
          {t('cri.desc')}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('installation.title')}</strong>
          {t('installation.desc')}
        </li>
        <li className="text-muted-foreground md:text-lg text-[1.1rem] md:leading-9 leading-6 tracking-wide">
          <strong>{t('durability.title')}</strong>
          {t('durability.desc')}
        </li>
      </ul>
    </div>
  );
}

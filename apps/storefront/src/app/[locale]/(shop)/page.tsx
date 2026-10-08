import { Image } from '@/components/Image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { connection } from 'next/server';
import { BRAND, type Locale } from '@newax/shared';
import { CommissionPortal } from '@/components/home/CommissionPortal';
import { SignatureStrip } from '@/components/home/SignatureStrip';
import { Film } from '@/components/Film';
import { ProductCard } from '@/components/ProductCard';
import { Link } from '@/i18n/navigation';
import { instagramHandle, isFilled, whatsappUrl } from '@/lib/brand-contact';
import { loadHome } from '@/lib/home-data';
import { film, image } from '@/lib/media';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  // The shelves come from the API, so the page is rendered per request (and the API reads cached for a minute).
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const { signature, arrivals } = await loadHome(locale as Locale);

  const consultations = [
    { n: 1, kind: 'atelier', note: isFilled(BRAND.contact.address) ? BRAND.contact.address : '' },
    { n: 2, kind: 'home', note: '' },
    { n: 3, kind: 'video', note: '' },
  ] as const;

  return (
    <>
      {/* 1 · Hero */}
      <section aria-label={t('heroAria')} data-keep="dark" className="hero">
        <div className="split" aria-hidden="true">
          <div className="sp sp-l">
            <Film film={film('sculpting-florals')} sizes="34vw" />
          </div>
          <div className="sp sp-c">
            <div className="drift">
              <Film film={film('hero-desktop')} mobile={film('hero-mobile')} priority focus="u-focus-30" />
            </div>
          </div>
          <div className="sp sp-r">
            <Film film={film('mehr-film')} sizes="34vw" />
          </div>
        </div>
        <div className="hero-scrim rise d1" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow rise d1">{t('heroEyebrow')}</span>
          <h1 className="serif h-hero rise d2">
            {t('heroTitleA')}
            <br />
            <em>{t('heroTitleB')}</em>
          </h1>
          <p className="hero-lede rise d3">{t('heroBody')}</p>
          <div className="btn-row rise d4">
            <Link className="btn-gold" href={`/product/${BRAND.storefront.featured.flagship}`}>
              {t('heroPrimary')}
            </Link>
            <Link className="btn-line" href="/#commission">
              {t('heroSecondary')}
            </Link>
          </div>
        </div>
        <div className="scroll-hint rise d5 hide-sm" aria-hidden="true">
          <span>{t('scroll')}</span>
          <div className="scroll-cue" />
        </div>
      </section>

      {/* 2 · The house */}
      <section aria-label={t('houseAria')} className="house">
        <div className="house-copy reveal">
          <span className="eyebrow">{t('houseEyebrow')}</span>
          <p className="serif house-title">{t.rich('houseTitle', { em: (chunks) => <em>{chunks}</em> })}</p>
          <p className="house-body">{t('houseBody')}</p>
        </div>
        <div className="reveal ph house-film">
          <Film film={film('hero-mobile')} label={t('houseFilm')} sizes="380px" />
        </div>
      </section>

      {/* 3 · Signature pieces (left out if the collection cannot be read) */}
      <SignatureStrip pieces={signature} />

      {/* 4 · MEHR, full width */}
      <section aria-label={t('mehrAria')} className="mehr-wrap">
        <div className="widen ph" data-keep="dark">
          <Image src={image('mehr-walking-veil')} alt={t('mehrAlt')} fill sizes="100vw" className="photo u-focus-28" />
          <div className="widen-shade" aria-hidden="true" />
          <div className="widen-txt">
            <div className="heading-block">
              <span className="eyebrow">{t('mehrEyebrow')}</span>
              <h2 className="serif widen-title">{t('mehrTitle')}</h2>
              <span className="widen-body">{t('mehrBody')}</span>
            </div>
            <Link className="btn-gold" href={`/product/${BRAND.storefront.featured.flagship}`}>
              {t('mehrCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* 5 · New at ROYA */}
      {arrivals.length > 0 ? (
        <section aria-label={t('newAria')} className="section section-shelf">
          <div className="section-head">
            <div className="reveal heading-block">
              <span className="eyebrow">{t('newEyebrow')}</span>
              <h2 className="serif h-section">{t('newTitle')}</h2>
            </div>
            <Link className="navlink" href="/collection">
              {t('newLink')}
            </Link>
          </div>
          <div className="pgrid">
            {arrivals.map((card) => (
              <ProductCard key={card.slug} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 6 · The Commission */}
      <CommissionPortal />

      {/* 7 · From the atelier */}
      <section id="atelier" aria-label={t('atelierAria')} className="section section-atelier">
        <div className="reveal section-head">
          <div className="heading-block">
            <span className="eyebrow">{t('atelierEyebrow')}</span>
            <h2 className="serif h-section u-max-w-640">
              {t.rich('atelierTitle', { em: (chunks) => <em>{chunks}</em> })}
            </h2>
          </div>
          <p className="atelier-lede">{t('atelierBody')}</p>
        </div>
        <div className="agrid">
          <div className="blurin card ph atelier-tile" data-keep="dark">
            <Film film={film('the-making')} label={t('filmMaking')} sizes="(max-width: 700px) 72vw, 33vw" />
            <span className="tile-caption">{t('captionMaking')}</span>
          </div>
          <div className="blurin card ph atelier-tile" data-keep="dark">
            <Film film={film('sculpting-florals')} label={t('filmFlorals')} sizes="(max-width: 700px) 72vw, 33vw" />
            <span className="tile-caption">{t('captionFlorals')}</span>
          </div>
          <div className="blurin card ph atelier-tile" data-keep="dark">
            <div className="zoom">
              <Image
                src={image('noir-corset-inside')}
                alt={t('altCorset')}
                fill
                sizes="(max-width: 700px) 72vw, 33vw"
                className="photo"
              />
            </div>
            <span className="tile-caption">{t('captionCorset')}</span>
          </div>
        </div>
      </section>

      {/* 8 · A client's words */}
      <section aria-label={t('quoteAria')} className="quote">
        <span className="eyebrow">{t('quoteEyebrow')}</span>
        <blockquote className="blurin serif">{t.rich('quote', { em: (chunks) => <em>{chunks}</em> })}</blockquote>
      </section>

      {/* 9 · The ROYA box */}
      <section aria-label={t('boxAria')} className="box">
        <div className="card ph parallax box-photo">
          <div className="zoom">
            <Image
              src={image('roya-box')}
              alt={t('boxAlt')}
              fill
              sizes="(max-width: 1000px) 100vw, 50vw"
              className="photo"
            />
          </div>
        </div>
        <div className="box-copy">
          <div className="reveal stack u-gap-18">
            <span className="eyebrow">{t('boxEyebrow')}</span>
            <h2 className="serif h-section">{t('boxTitle')}</h2>
            <p className="box-body">{t('boxBody')}</p>
          </div>
          <div className="blurin ph card box-thumb">
            <div className="zoom">
              <Image src={image('lilas-in-box')} alt={t('boxAltLabel')} fill sizes="320px" className="photo" />
            </div>
          </div>
        </div>
      </section>

      {/* 10 · Consultations */}
      <section id="consult" aria-label={t('consultAria')} className="section consult">
        <div className="reveal consult-head">
          <span className="eyebrow">{t('consultEyebrow')}</span>
          <h2 className="serif consult-title">{t.rich('consultTitle', { em: (chunks) => <em>{chunks}</em> })}</h2>
        </div>
        <div className="consult-grid">
          {consultations.map(({ n, kind, note }) => (
            <div key={kind} className="blurin consult-card">
              <span className="serif roman">{t(`consult${n}Num`)}</span>
              <h3 className="serif">{t(`consult${n}Title`)}</h3>
              <p>
                {t(`consult${n}Body`)}
                {note ? ` ${note}` : ''}
              </p>
              <Link className="navlink" href={{ pathname: '/consultation', query: { kind } }}>
                {t(`consult${n}Cta`)}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 11 · Closing banner */}
      <section aria-label={t('closingAria')} data-keep="dark" className="closing parallax">
        <Image
          src={image('wear-your-dream-foil')}
          alt={t('closingAlt')}
          fill
          sizes="100vw"
          className="photo closing-photo"
        />
        <div className="closing-inner">
          <div className="stack u-gap-10">
            <span className="label u-c-accent">{t('closingEyebrow')}</span>
            <p className="serif closing-title">{t('closingTitle')}</p>
          </div>
          <div className="btn-row">
            <a className="btn-gold" href={whatsappUrl} rel="noopener" target="_blank">
              {t('whatsapp')}
            </a>
            <a className="btn-line" href={BRAND.socials.instagram} rel="noopener" target="_blank">
              {t('instagram', { handle: instagramHandle })}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

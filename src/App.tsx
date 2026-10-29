import { FormEvent, lazy, Suspense, useCallback, useEffect, useState } from "react"

import Icon, { type IconName } from "./components/Icon"
import FloatingActions, { openWidget, PreviewNote, SendError, UsherForm, useSend } from "./components/PublicWidgets"
import { saveSubmission } from "./lib/submissions"
import AnnouncementPopup, { openAnnouncement, useActiveAnnouncements, useFileUrl } from "./components/AnnouncementPopup"
import { formatEventDate, type Announcement } from "./lib/announcements"

const AdminApp = lazy(() => import("./AdminApp"))

const church = {
  address: "Avenida Boyacá #8-13",
  area: "Castilla · Bogotá, Colombia",
  maps: "https://maps.google.com/?q=Avenida+Boyaca+8-13+Castilla+Bogota",
  mapEmbed:
    "https://www.google.com/maps?q=Avenida%20Boyac%C3%A1%20%238-13%2C%20Castilla%2C%20Bogot%C3%A1&output=embed",
  instagram: "https://www.instagram.com/iglesiamai/",
  handle: "@iglesiamai",
  tiktok: "https://www.tiktok.com/@maiiglesia",
  facebook: "https://www.facebook.com/Iglesiamai/",
  youtube: "https://www.youtube.com/@IglesiaMAI",
}

const socials: { name: string; icon: IconName; href: string; handle: string; text: string }[] = [
  { name: "Instagram", icon: "instagram", href: church.instagram, handle: "@iglesiamai", text: "Reels, versículos y todo lo que viene esta semana." },
  { name: "TikTok", icon: "tiktok", href: church.tiktok, handle: "@maiiglesia", text: "Momentos reales de nuestros servicios y encuentros." },
  { name: "Facebook", icon: "facebook", href: church.facebook, handle: "Iglesia MAI", text: "Reels y novedades para compartir con tu familia." },
  { name: "YouTube", icon: "youtube", href: church.youtube, handle: "@IglesiaMAI", text: "Cientos de prédicas completas para volver a escuchar." },
]

const photos = {
  // Stock images kept from the original design (no real equivalent yet)
  hero: "https://images.unsplash.com/photo-1630449151135-6db9690cbda4?auto=format&fit=crop&w=2200&q=90",
  // Real photos from Iglesia MAI
  children: "/mai-kids.jpg",
  embrace: "/mai-welcome.jpg",
  prayer: "/mai-prayer.jpg",
  worshipLeader: "/mai-worship.jpg",
  worshipRoom: "/mai-hero.jpg",
  praise: "/mai-community.jpg",
  youth: "/mai-singing.jpg",
  handsUp: "/mai-adoracion-sala.jpg",
  greatLove: "/mai-gathering.jpg",
  flyer: "/mai-flyer-domingo.jpg",
  flyerSunday: "/mai-flyer-domingo-2.jpg",
  exalt: "/mai-exaltemos.jpg",
  couplePraying: "/mai-oracion-pareja.jpg",
  menPraying: "/mai-hombres-orando.jpg",
  womanPraying: "/mai-mujer-orando.jpg",
  congregation: "/mai-congregacion-promesa.jpg",
}

/** Voices that bring the Word at MAI (newest photos), shown as a moving film strip. */
const voices = [
  "/mai-predica-pastor-1.jpg",
  "/mai-mujer-palabra-2.jpg",
  "/mai-predica-invitado.jpg",
  "/mai-mujer-palabra-1.jpg",
  "/mai-predica-sonrisa.jpg",
  "/mai-mujer-palabra-3.jpg",
  "/mai-predica-verde.jpg",
  "/mai-predica-cruz.jpg",
  "/mai-predica-pastor-2.jpg",
]

/** Designed pieces with a phrase on them (gallery only, the text is part of the image). */
const phrases = ["/mai-no-sabes-las-batallas.jpg", "/mai-ora-por-tus-amigos.jpg", "/mai-seguir-a-jesus.jpg", "/mai-flyer-domingo-2.jpg"]

const preaching = [
  "/mai-palabra-1.jpg",
  "/mai-sermon.jpg",
  "/mai-palabra-3.jpg",
  "/mai-palabra-5.jpg",
  "/mai-palabra-4.jpg",
  "/mai-palabra-6.jpg",
  "/mai-palabra-7.jpg",
]

const baptisms = [
  "/mai-bautizo-1.jpg",
  "/mai-bautizo-2.jpg",
  "/mai-bautizo-3.jpg",
  "/mai-bautizo-4.jpg",
  "/mai-bautizo-5.jpg",
  "/mai-bautizo-6.jpg",
]

type Route = "" | "nosotros" | "reuniones" | "ministerios" | "mensajes" | "galeria" | "contacto"

const pages: { route: Route; label: string; title: string }[] = [
  { route: "", label: "Inicio", title: "Iglesia Cristiana MAI · Bogotá" },
  { route: "nosotros", label: "Conócenos", title: "Conócenos · Iglesia MAI" },
  { route: "reuniones", label: "Reuniones", title: "Reuniones · Iglesia MAI" },
  { route: "ministerios", label: "Ministerios", title: "Ministerios · Iglesia MAI" },
  { route: "mensajes", label: "Mensajes", title: "Mensajes · Iglesia MAI" },
  { route: "galeria", label: "Galería", title: "Galería · Iglesia MAI" },
  { route: "contacto", label: "Contacto", title: "Contacto · Iglesia MAI" },
]

const to = (route: Route, section?: string) => `#/${route}${section ? `/${section}` : ""}`

/** Pages linked from the header; the rest live in the home panels, menu and footer. */
const headerRoutes: Route[] = ["", "mensajes", "contacto"]

function readRoute(): Route {
  const slug = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0]
  return pages.some((p) => p.route === slug) ? (slug as Route) : ""
}

function readSection() {
  return window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[1] ?? ""
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href={to("")} className={`logo ${light ? "logo-light" : ""}`} aria-label="Iglesia MAI, inicio">
      <img src={light ? "/logo-mai-white.png" : "/logo-mai.png"} alt="Iglesia Cristiana MAI" />
    </a>
  )
}

function Button({
  children,
  href = "#",
  variant = "primary",
  icon = true,
  external = false,
}: {
  children: React.ReactNode
  href?: string
  variant?: "primary" | "light" | "outline" | "text"
  icon?: boolean
  external?: boolean
}) {
  return (
    <a
      href={href}
      className={`button button-${variant}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
      {icon && <Icon name="arrow" />}
    </a>
  )
}

function SectionHeader({
  eyebrow,
  title,
  intro,
  light = false,
}: {
  eyebrow: string
  title: React.ReactNode
  intro?: string
  light?: boolean
}) {
  return (
    <header className={`section-header reveal ${light ? "section-header-light" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Turn on once the church starts streaming: shows "Ver transmisión" / "En vivo ahora" in the header. */
const STREAMING_ENABLED = false

/** Sundays 8:00–12:00 in Bogotá (UTC-5, no DST): both services are on. */
function isServiceLive() {
  const bogota = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const hour = bogota.getUTCHours()
  return bogota.getUTCDay() === 0 && hour >= 8 && hour < 12
}

function Navbar({ route }: { route: Route }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [live, setLive] = useState(isServiceLive)

  useEffect(() => {
    const id = window.setInterval(() => setLive(isServiceLive()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [route])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      <a href="#contenido" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus() }}>
        Saltar al contenido
      </a>
      <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`} aria-label="Principal">
        <Logo light={!scrolled} />
        <div className="nav-links">
          {pages
            .filter((p) => headerRoutes.includes(p.route))
            .flatMap((p) => {
              const link = (
                <a key={p.route} href={to(p.route)} className={route === p.route ? "is-active" : ""} aria-current={route === p.route ? "page" : undefined}>
                  {p.label}
                </a>
              )
              return p.route === "mensajes"
                ? [link, <button key="oracion" onClick={() => openWidget("oracion")}>Necesito oración</button>]
                : [link]
            })}
        </div>
        <div className="nav-actions">
          {STREAMING_ENABLED && (
            <a href={church.instagram} target="_blank" rel="noreferrer" className={`nav-live ${live ? "is-live" : ""}`}>
              <span /> {live ? "En vivo ahora" : "Ver transmisión"}
            </a>
          )}
          <Button href={to("reuniones")} variant={scrolled ? "primary" : "light"} icon={false}>
            Quiero conocer MAI
          </Button>
        </div>
        <button className="menu-trigger" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}>
          <Icon name="menu" />
        </button>
      </nav>
      <div className={`mobile-menu ${open ? "mobile-menu-open" : ""}`} aria-hidden={!open} inert={!open}>
        <div className="mobile-menu-top">
          <Logo light />
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <Icon name="close" />
          </button>
        </div>
        <div className="mobile-menu-links">
          {pages.map((p, i) => (
            <a key={p.route} href={to(p.route)} className={route === p.route ? "is-active" : ""}>
              <span>0{i + 1}</span>
              {p.label}
            </a>
          ))}
        </div>
        <div className="mobile-menu-footer">
          <p>Domingos 8:00 y 10:00 AM</p>
          <SocialLinks />
        </div>
      </div>
    </>
  )
}

function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  image,
  position = "center",
  crumb,
}: {
  eyebrow: string
  title: string
  accent: string
  intro: string
  image: string
  position?: string
  crumb: string
}) {
  return (
    <section className="page-hero">
      {/* Real photos are small portraits: blurred as backdrop, shown sharp in a frame */}
      <img className="page-hero-bg" src={image} alt="" style={{ objectPosition: position }} />
      <div className="hero-overlay" />
      <div className="page-hero-inner">
        <div className="page-hero-content">
          <nav className="breadcrumb" aria-label="Ruta">
            <a href={to("")}>Inicio</a>
            <span>/</span>
            <span>{crumb}</span>
          </nav>
          <p className="hero-kicker">{eyebrow}</p>
          <h1>
            {title}
            <br />
            <em>{accent}</em>
          </h1>
          <p className="hero-copy">{intro}</p>
        </div>
        <figure className="page-hero-photo">
          <img src={image} alt={`${crumb} · Iglesia MAI`} />
        </figure>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contacto">
      <div className="footer-top">
        <div className="footer-brand">
          <Logo light />
          <p>
            Extendiendo el reino de Dios,{" "}
            <br />
            <em>un corazón a la vez.</em>
          </p>
          <SocialLinks />
        </div>
        <div className="footer-col">
          <p>Navegación</p>
          {pages.map((p) => (
            <a href={to(p.route)} key={p.route}>
              {p.label}
            </a>
          ))}
        </div>
        <div className="footer-col">
          <p>Conecta</p>
          {socials.map((s) => (
            <a href={s.href} target="_blank" rel="noreferrer" key={s.name}>
              {s.name}
            </a>
          ))}
          <button onClick={() => openWidget("palabra")}>Palabra de hoy</button>
          <button onClick={() => openWidget("oracion")}>Necesito oración</button>
          <button onClick={() => openWidget("visita")}>Quiero que me inviten</button>
        </div>
        <div className="footer-col footer-visit">
          <p>Visítanos</p>
          <span>
            Domingos · 8:00 y 10:00 AM
            <br />
            {church.address}
            <br />
            {church.area}
          </span>
          <Button href={church.maps} variant="text" external>
            Cómo llegar
          </Button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Iglesia Cristiana MAI</span>
        <a href="https://www.codecstudio.online/" target="_blank" rel="noreferrer" className="footer-credit">
          Diseñado por <strong>Codec Studio</strong>
        </a>
        <a href="#/admin">Acceso interno</a>
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }) }}>
          Volver arriba ↑
        </a>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/* Shared sections                                                     */
/* ------------------------------------------------------------------ */

function NextMeeting() {
  return (
    <section id="reuniones" className="meeting">
      <div className="meeting-heading reveal">
        <p className="eyebrow">Próxima reunión</p>
        <h2>
          Nos vemos
          <br />
          <em>en casa.</em>
        </h2>
      </div>
      <div className="meeting-times reveal">
        <p>Domingos · Servicio familiar</p>
        <div>
          <strong>8:00</strong>
          <span>AM</span>
        </div>
        <div>
          <strong>10:00</strong>
          <span>AM</span>
        </div>
      </div>
      <div className="meeting-place reveal">
        <Icon name="pin" />
        <div>
          <p>{church.address}</p>
          <span>{church.area}</span>
        </div>
        <Button href={church.maps} variant="text" external>
          Cómo llegar
        </Button>
        <a href={to("reuniones")} className="subtle-link">
          Ver qué esperar
        </a>
      </div>
    </section>
  )
}

function InviteBanner() {
  return (
    <section className="invite-banner">
      <div className="reveal">
        <p className="eyebrow">¿Te da pena llegar sin conocer a nadie?</p>
        <h3>
          Déjanos invitarte. Alguien de MAI te escribirá y <em>te esperará en la puerta.</em>
        </h3>
      </div>
      <div className="invite-actions reveal">
        <button className="button button-light" onClick={() => openWidget("visita")}>
          Quiero que me inviten <Icon name="arrow" />
        </button>
        <button className="button button-outline" onClick={() => openWidget("oracion")}>
          Necesito oración <Icon name="arrow" />
        </button>
      </div>
    </section>
  )
}

function CTA({ image = photos.hero }: { image?: string }) {
  return (
    <section className="cta">
      <img src={image} alt="" />
      <div className="cta-overlay" />
      <div className="cta-content reveal">
        <p className="eyebrow">Tu próximo paso</p>
        <h2>
          Tu historia puede
          <br />
          <em>comenzar aquí.</em>
        </h2>
        <p>No importa dónde estés en tu camino de fe. Hay un lugar para ti en MAI.</p>
        <div className="button-row">
          <Button href={to("reuniones")} variant="light">
            Planea tu visita
          </Button>
          <Button href={to("contacto")} variant="outline">
            Quiero hablar con alguien
          </Button>
        </div>
      </div>
    </section>
  )
}

function Pillars() {
  const pillars = [
    ["01", "Conocer a Dios", "Una relación real y personal con Jesús."],
    ["02", "Crecer juntos", "Una familia donde nadie camina solo."],
    ["03", "Vivir el propósito", "Una vida que impacta a otros."],
  ]
  return (
    <div className="pillars">
      {pillars.map(([number, title, text]) => (
        <article className="pillar reveal" key={number}>
          <span>{number}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Encuentros y convenciones                                           */
/* ------------------------------------------------------------------ */

/**
 * The yearly gatherings. Dates change every year, so they are not written
 * here: when the admin publishes an announcement whose title names the
 * gathering (e.g. "Encuentro de Hombres 2027") with an event date, the card
 * shows that date and opens the announcement to sign up.
 */
const gatherings: {
  id: string
  match: string[]
  frequency: string
  title: string
  text: string
  image: string
  position?: string
}[] = [
  {
    id: "encuentro-hombres",
    match: ["encuentro", "hombre"],
    frequency: "Dos veces al año",
    title: "Encuentro de Hombres",
    text: "Un tiempo apartado para que cada hombre se encuentre con Dios, deje sus cargas y vuelva a casa fortalecido como hijo, esposo y padre.",
    image: photos.menPraying,
    position: "center 30%",
  },
  {
    id: "encuentro-mujeres",
    match: ["encuentro", "mujer"],
    frequency: "Dos veces al año",
    title: "Encuentro de Mujeres",
    text: "Días de restauración, oración y Palabra para que cada mujer reciba sanidad, renueve su fe y descubra lo que Dios dice de ella.",
    image: photos.womanPraying,
    position: "center 25%",
  },
  {
    id: "convencion-hombres",
    match: ["convenc", "hombre"],
    frequency: "Una vez al año",
    title: "Convención de Hombres",
    text: "Hombres de toda la iglesia reunidos para recibir visión, levantarse como líderes y caminar juntos en el propósito de Dios.",
    image: "/mai-predica-pastor-1.jpg",
    position: "center 20%",
  },
  {
    id: "convencion-mujeres",
    match: ["convenc", "mujer"],
    frequency: "Una vez al año",
    title: "Convención de Mujeres",
    text: "Una celebración de fe con invitadas, adoración y enseñanza para mujeres de todas las edades y etapas.",
    image: "/mai-mujer-palabra-2.jpg",
    position: "center 20%",
  },
  {
    id: "convencion-general",
    match: ["convenc", "general"],
    frequency: "Toda la iglesia",
    title: "Convención General",
    text: "El encuentro más grande del año: familias, jóvenes y niños unidos para adorar, escuchar la Palabra y celebrar lo que Dios ha hecho.",
    image: photos.congregation,
    position: "center 35%",
  },
]

const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Upcoming announcements (soonest first) whose title names this gathering. */
function datesFor(match: string[], announcements: Announcement[]) {
  const today = todayKey()
  return announcements
    .filter((a) => a.eventDate && a.eventDate >= today && match.every((w) => normalize(a.title).includes(w)))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 2)
}

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

function Gatherings() {
  const announcements = useActiveAnnouncements()
  const year = new Date().getFullYear()
  return (
    <section className="gatherings section-pad">
      <div className="gatherings-top">
        <SectionHeader
          eyebrow={`Calendario MAI · ${year}`}
          title={
            <>
              Encuentros y <em>convenciones.</em>
            </>
          }
          intro="Cada año apartamos fechas especiales para buscar a Dios juntos. Las fechas se anuncian aquí y en nuestro Instagram."
          light
        />
        <i className="gatherings-line reveal" aria-hidden="true" />
      </div>
      <div className="gatherings-grid">
        {gatherings.map((g, i) => {
          const dates = datesFor(g.match, announcements)
          return (
            <article className={`gathering reveal ${i < 2 ? "gathering-wide" : ""}`} key={g.id}>
              <img src={g.image} alt="" loading="lazy" style={{ objectPosition: g.position }} />
              <div className="gathering-shade" />
              <div className="gathering-body">
                <p className="gathering-frequency">{g.frequency}</p>
                <h3>{g.title}</h3>
                <span>{g.text}</span>
                <div className="gathering-foot">
                  {dates.length ? (
                    <>
                      <span className="gathering-date">
                        <Icon name="clock" />
                        {dates.map((d) => shortDate(d.eventDate)).join(" · ")}
                      </span>
                      <button className="gathering-cta" onClick={() => openAnnouncement(dates[0].id)}>
                        Inscríbete <Icon name="arrow" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="gathering-date gathering-date-soon">Fecha por anunciar</span>
                      <a className="gathering-cta" href={church.instagram} target="_blank" rel="noreferrer">
                        Ver novedades <Icon name="arrow" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/** Slow ribbon of words between sections. */
function PhraseBand({ dark = false }: { dark?: boolean }) {
  const words = ["Fe", "Familia", "Propósito", "Adoración", "Palabra", "Oración", "Comunidad", "Gracia"]
  const row = (hidden: boolean) => (
    <div className="phrase-row" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <span key={w}>
          {w}
          <i>✦</i>
        </span>
      ))}
    </div>
  )
  return (
    <div className={`phrase-band ${dark ? "phrase-band-dark" : ""}`}>
      <div className="phrase-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function HomePage() {
  return (
    <>
      <section className="hero hero--video">
        <video
          className="hero-media"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-mai-poster.jpg"
          aria-label="Congregación de Iglesia MAI adorando juntos"
        >
          <source src="/videos/hero-mai-720.mp4" type="video/mp4" media="(max-width: 768px)" />
          <source src="/videos/hero-mai.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker">Iglesia MAI</p>
          <h1>
            Extendiendo el reino de Dios,{" "}
            <br />
            <em>un corazón a la vez.</em>
          </h1>
          <p className="hero-copy">
            Un lugar para conocer a Dios, crecer en comunidad y vivir el propósito que Él tiene para
            ti.
          </p>
          <div className="button-row">
            <Button href={to("nosotros")} variant="light">
              Quiero conocer MAI
            </Button>
            <Button href={to("reuniones")} variant="outline">
              Ver nuestra próxima reunión
            </Button>
          </div>
        </div>
        <div className="hero-location">
          <span>Bogotá</span>
          <i />
          <span>Colombia</span>
        </div>
        <div className="hero-scroll">
          <span>Descubre MAI</span>
          <i />
        </div>
      </section>

      <Activities />
      <MomentWithGod />

      <section className="welcome section-pad">
        <div className="welcome-image reveal">
          <img src={photos.embrace} alt="Una madre y su hija abrazadas durante un servicio" />
          <span>Fe · Familia · Propósito</span>
        </div>
        <div className="welcome-copy reveal">
          <p className="eyebrow">Bienvenidos a MAI</p>
          <h2>
            Hay un lugar
            <br />
            <em>para ti.</em>
          </h2>
          <p>
            MAI es una familia. Queremos que puedas acercarte a Dios, encontrar comunidad, crecer en
            tu fe y descubrir el propósito que Él tiene para tu vida.
          </p>
          <Button href={to("nosotros")} variant="primary">
            Conoce nuestra historia
          </Button>
          <blockquote>
            “Mirad cuán bueno y cuán delicioso es habitar los hermanos juntos en armonía.”
            <cite>Salmos 133:1</cite>
          </blockquote>
        </div>
      </section>

      <section className="vision section-pad">
        <div className="vision-top">
          <SectionHeader eyebrow="Nuestra visión" title="Un corazón a la vez." light />
          <p className="vision-intro reveal">
            Creemos que transformar una ciudad comienza con transformar corazones. Por eso existimos
            para anunciar a Jesús, formar discípulos, construir familias y extender el Reino de
            Dios.
          </p>
        </div>
        <div className="photo-trio">
          {[photos.worshipLeader, preaching[1], photos.prayer].map((src, i) => (
            <figure key={src} className="reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
              <img src={src} alt={["Líder de alabanza en MAI", "Predicación en MAI", "Momento de oración en MAI"][i]} loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <Gatherings />
      <PhraseBand />

      <BaptismStrip />

      <SocialSection />

      <CTA />
    </>
  )
}

const activities: { route: Route; section?: string; kicker: string; title: string; accent?: string; cta: string; text: string; image: string; tint: string }[] = [
  { route: "reuniones", kicker: "Domingos 8:00 y 10:00 AM", title: "Reunión", accent: "dominical", cta: "Planea tu visita", text: "Adoración, Palabra y una familia que te recibe con los brazos abiertos.", image: photos.worshipRoom, tint: "201,99,26" },
  { route: "nosotros", kicker: "Quiénes somos", title: "Conócenos", cta: "Nuestra historia", text: "Nuestra historia, lo que creemos y hacia dónde vamos juntos.", image: photos.embrace, tint: "22,140,156" },
  { route: "ministerios", kicker: "Sirve con nosotros", title: "Ministerios", cta: "Encuentra tu lugar", text: "Alabanza, Servicio, Intercesión y MAI Kids: hay un lugar para tus dones.", image: photos.youth, tint: "120,40,60" },
  { route: "reuniones", section: "eventos", kicker: "Agenda MAI", title: "Eventos", cta: "Ver agenda", text: "Encuentros, convenciones y fechas especiales para buscar a Dios.", image: photos.menPraying, tint: "233,138,67" },
  { route: "ministerios", section: "hogares", kicker: "Grupos en casa", title: "Hogares de", accent: "avivamiento", cta: "Únete a un hogar", text: "Casas abiertas en la ciudad para orar, compartir y crecer juntos.", image: photos.couplePraying, tint: "18,59,74" },
  { route: "galeria", kicker: "Momentos MAI", title: "Galería", cta: "Ver fotos", text: "Lo que Dios está haciendo en nuestra casa, en imágenes.", image: photos.praise, tint: "90,70,140" },
]

function Activities() {
  return (
    <section className="activities" aria-labelledby="activities-title">
      <div className="activities-intro">
        <div className="activities-echo" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i}>Descubre MAI</span>
          ))}
        </div>
        <p className="eyebrow">Explora</p>
        <h2 id="activities-title">
          Descubre <em>MAI.</em>
        </h2>
        <p>Todo lo que somos y hacemos como familia, a un clic de distancia.</p>
      </div>
      <div className="activities-track">
        {activities.map((a) => (
          <a
            href={to(a.route, a.section)}
            className="activity reveal"
            key={a.title}
            style={{ "--tint": a.tint } as React.CSSProperties}
          >
            <img src={a.image} alt="" loading="lazy" />
            <div className="activity-shade" />
            <div className="activity-body">
              <p>{a.kicker}</p>
              <h3>
                {a.title} {a.accent && <em>{a.accent}</em>}
              </h3>
              <strong>
                {a.cta} <Icon name="arrow" />
              </strong>
              <span>{a.text}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function MomentWithGod() {
  return (
    <section className="moment-home section-pad">
      <div className="moment-home-orb" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="moment-home-copy reveal">
        <p className="eyebrow">Un momento con Dios</p>
        <h2>
          Él te está <em>esperando.</em>
        </h2>
        <p className="section-intro">
          Antes de cualquier actividad, lo más importante es Él. Detente un momento: no necesitas
          palabras perfectas, Dios escucha tu corazón.
        </p>
        <blockquote className="moment-home-verse">
          “Acercaos a Dios, y él se acercará a vosotros.”
          <cite>Santiago 4:8</cite>
        </blockquote>
        <button className="moment-home-seek" onClick={() => openWidget("jesus")}>
          ¿Nunca has orado o quieres conocer a Jesús? <span>Empieza aquí</span> <Icon name="arrow" />
        </button>
      </div>
      <div className="moment-home-actions">
        <button className="moment-card reveal" onClick={() => openWidget("momento")}>
          {/* Desktop shows a preview of the experience; phones keep the compact card */}
          <span className="moment-card-orb" aria-hidden="true">
            <i />
            <i />
            <b>
              <em>Inhala</em>
              <em>Exhala</em>
            </b>
          </span>
          <span className="moment-card-icon">
            <Icon name="heart" />
          </span>
          <span className="moment-card-text">
            <small>Oraciones guiadas</small>
            <strong>1 minuto para Dios</strong>
            <span>Cada día una oración distinta, con voz y música, para acercarte a Dios con un corazón rendido.</span>
          </span>
          <span className="moment-card-steps" aria-hidden="true">
            {["Rendición", "Gratitud", "Perdón", "Obediencia"].map((step) => (
              <i key={step}>{step}</i>
            ))}
          </span>
          <span className="moment-card-cta">
            Empezar ahora <Icon name="arrow" />
          </span>
          <Icon name="arrow" />
        </button>
      </div>
    </section>
  )
}

function SocialSection() {
  return (
    <section className="social section-pad">
      <div className="section-topline">
        <SectionHeader
          eyebrow="MAI en redes"
          title={<>Síguenos <em>donde estés.</em></>}
          intro="La semana también es casa. Palabra, reels y momentos de cada servicio para que nunca camines solo. Compártelos con alguien que necesite escuchar: hay un lugar para ti."
        />
      </div>
      <div className="social-grid">
        {socials.map((s, i) => (
          <a href={s.href} target="_blank" rel="noreferrer" className="social-card reveal" key={s.name} style={{ transitionDelay: `${i * 0.08}s` }}>
            <span className="social-icon">
              <Icon name={s.icon} />
            </span>
            <p>{s.name}</p>
            <h3>{s.handle}</h3>
            <span>{s.text}</span>
            <i>
              Seguir <Icon name="arrow" />
            </i>
          </a>
        ))}
      </div>
    </section>
  )
}

function SocialLinks() {
  return (
    <div className="social-links">
      {socials.map((s) => (
        <a href={s.href} target="_blank" rel="noreferrer" key={s.name} aria-label={`${s.name} de Iglesia MAI`}>
          <Icon name={s.icon} />
        </a>
      ))}
    </div>
  )
}

function BaptismStrip() {
  return (
    <section className="baptisms section-pad">
      <div className="section-topline">
        <SectionHeader
          eyebrow="Vidas transformadas"
          title={
            <>
              Cada bautizo, <em>una historia de gracia.</em>
            </>
          }
          intro="Celebramos cada vez que alguien decide seguir a Jesús públicamente. Lo viejo pasó; todo es hecho nuevo."
        />
        <Button href={to("galeria")} variant="text">
          Ver galería completa
        </Button>
      </div>
      <div className="baptism-grid">
        {baptisms.map((src, i) => (
          <figure key={src} className="reveal" style={{ transitionDelay: `${i * 0.06}s` }}>
            <img src={src} alt="Momento de bautizo en Iglesia MAI" loading="lazy" />
          </figure>
        ))}
      </div>
      <p className="verse-line reveal">
        “De modo que si alguno está en Cristo, nueva criatura es.” <cite>2 Corintios 5:17</cite>
      </p>
    </section>
  )
}

function AboutPage() {
  const values: [string, string][] = [
    ["Jesús en el centro", "Todo lo que hacemos nace de una relación viva con Él y apunta hacia Él."],
    ["La Palabra como guía", "Creemos que la Biblia tiene respuestas reales para la vida de hoy."],
    ["Familia", "Somos una casa abierta donde cada persona es recibida y cuidada."],
    ["Oración", "Dependemos de Dios en todo y oramos unos por otros."],
    ["Servicio", "Servimos con alegría dentro y fuera de la iglesia."],
    ["Generosidad", "Damos con gratitud porque hemos recibido por gracia."],
  ]
  return (
    <>
      <PageHero
        crumb="Conócenos"
        eyebrow="Conócenos"
        title="Somos una familia"
        accent="que ama a Dios."
        intro="Una iglesia cristiana en Castilla, Bogotá, que existe para que cada persona conozca a Jesús y viva el propósito que Él tiene para su vida."
        image={photos.handsUp}
        position="center 35%"
      />

      <section className="story section-pad">
        <div className="story-copy reveal">
          <p className="eyebrow">Nuestra historia</p>
          <h2>
            Extendiendo el reino,
            <br />
            <em>un corazón a la vez.</em>
          </h2>
          <p>
            MAI nació con un sueño sencillo y poderoso: que cada persona que cruce nuestras puertas
            encuentre el amor de Dios y una familia que camine con ella. No buscamos ser una iglesia
            perfecta, sino una iglesia real, donde las vidas son transformadas por la gracia de
            Jesús.
          </p>
          <p>
            Cada domingo nos reunimos para adorar, escuchar la Palabra y orar juntos. Entre semana
            seguimos creciendo en comunidad, sirviendo a nuestra ciudad y celebrando lo que Dios
            hace en cada familia.
          </p>
        </div>
        <div className="story-media reveal">
          <figure className="story-main">
            <img src={photos.embrace} alt="Una madre y su hija abrazadas durante un servicio" />
          </figure>
          <figure className="story-side">
            <img src={photos.prayer} alt="Una joven orando" />
          </figure>
        </div>
      </section>

      <section className="vision section-pad">
        <div className="vision-top">
          <SectionHeader eyebrow="Nuestra visión" title="Un corazón a la vez." light />
          <p className="vision-intro reveal">
            Creemos que transformar una ciudad comienza con transformar corazones. Por eso existimos
            para anunciar a Jesús, formar discípulos, construir familias y extender el Reino de
            Dios.
          </p>
        </div>
        <Pillars />
      </section>

      <section className="values section-pad">
        <SectionHeader
          eyebrow="Lo que nos define"
          title={
            <>
              Nuestros <em>valores.</em>
            </>
          }
          intro="Principios que guían cómo vivimos, servimos y caminamos juntos como iglesia."
        />
        <div className="values-grid">
          {values.map(([title, text]) => (
            <article className="value reveal" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <BaptismStrip />

      <CTA image={photos.worshipRoom} />
    </>
  )
}

function MeetingsPage() {
  const moments: [IconName, string, string, string][] = [
    ["music", "Alabanza y adoración", "Cantamos con el corazón abierto a lo que Dios quiere hacer en medio nuestro.", photos.exalt],
    ["book", "Una palabra para tu vida", "Enseñanza bíblica clara, práctica y llena de esperanza.", preaching[2]],
    ["hands", "Tiempo de oración", "Oramos juntos por las necesidades de cada persona y cada familia.", photos.couplePraying],
    ["users", "Una familia que te recibe", "Llega como eres. Te recibiremos con los brazos abiertos.", photos.embrace],
  ]
  const announcements = useActiveAnnouncements()
  const events = [
    { category: "Cada domingo", date: "DOM", title: "Servicio familiar", description: "Dos servicios: 8:00 AM y 10:00 AM.", image: photos.flyerSunday },
    { category: "Entre semana", date: "SEM.", title: "Hogares de Avivamiento", description: "Reuniones en casas para orar y estudiar la Palabra. Escríbenos y te conectamos.", image: photos.handsUp },
    { category: "Celebración", date: "PRÓX.", title: "Bautizos", description: "¿Quieres bautizarte? Escríbenos para acompañarte.", image: baptisms[2] },
  ]
  return (
    <>
      <PageHero
        crumb="Reuniones"
        eyebrow="Reuniones"
        title="Te esperamos"
        accent="este domingo."
        intro="Dos servicios familiares cada domingo. Ven tal como eres: aquí hay un lugar preparado para ti."
        image={photos.worshipRoom}
        position="center 40%"
      />

      <NextMeeting />
      <InviteBanner />

      <section className="expect section-pad">
        <SectionHeader
          eyebrow="Tu primera visita"
          title={
            <>
              Qué <em>esperar.</em>
            </>
          }
          intro="Sabemos que llegar a un lugar nuevo puede generar preguntas. Esto es lo que vivirás en un servicio de MAI."
        />
        <div className="expect-grid">
          {moments.map(([icon, title, text, image], i) => (
            <article className="expect-card reveal" key={title} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="expect-image">
                <img src={image} alt="" loading="lazy" />
              </div>
              <div className="expect-icon">
                <Icon name={icon} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <Gatherings />

      <section id="eventos" className="events section-pad">
        <div className="section-topline">
          <SectionHeader eyebrow="Agenda" title="Lo que está pasando en MAI" />
          <Button href={church.instagram} variant="text" external>
            Novedades en Instagram
          </Button>
        </div>
        <div className="events-grid">
          {announcements.map((a) => (
            <AnnouncementEvent key={a.id} item={a} />
          ))}
          {events.map((event) => (
            <article className="event-card reveal" key={event.title}>
              <div className="event-image">
                <img src={event.image} alt="" loading="lazy" />
                <span>{event.date}</span>
              </div>
              <div className="event-info">
                <p>{event.category}</p>
                <h3>{event.title}</h3>
                <span>{event.description}</span>
                <Button href={to("contacto")} variant="text">
                  Más información
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <LocationSection />
    </>
  )
}

function AnnouncementEvent({ item }: { item: Announcement }) {
  const image = useFileUrl(item.imageId)
  const date = formatEventDate(item.eventDate, item.eventTime)
  return (
    <article className="event-card event-card-announce">
      <div className="event-image">
        {image ? <img src={image} alt="" /> : <div className="event-image-fallback">{item.kicker}</div>}
        <span>{item.kicker.toUpperCase()}</span>
      </div>
      <div className="event-info">
        <p>{date || item.location || "Anuncio"}</p>
        <h3>{item.title}</h3>
        <span>{item.description}</span>
        <button className="button button-text" onClick={() => openAnnouncement(item.id)}>
          {item.ctaType === "inscripcion" ? item.ctaLabel || "Inscríbete aquí" : "Ver anuncio"} <Icon name="arrow" />
        </button>
      </div>
    </article>
  )
}

function MinistriesPage() {
  const ministries = [
    {
      title: "Alabanza y Adoración",
      tag: "Alabanza",
      text: "Un equipo de músicos y cantantes que guía a la iglesia a encontrarse con Dios. Más que cantar, queremos que cada canción sea una ofrenda que abra el corazón a Su presencia.",
      image: photos.exalt,
    },
    {
      title: "Servicio",
      tag: "Ujieres",
      text: "Los ujieres son el primer abrazo de MAI: reciben a cada persona en la puerta, la acompañan a su lugar y cuidan que cada servicio fluya en orden y con amor.",
      image: photos.embrace,
      usher: true,
    },
    {
      title: "Intercesión",
      tag: "Oración",
      text: "Un equipo que se para en la brecha por la iglesia, las familias y nuestra ciudad. Recibimos cada petición de oración y la llevamos delante de Dios.",
      image: photos.couplePraying,
    },
    {
      title: "MAI Kids",
      tag: "Niños",
      text: "Un espacio seguro, alegre y lleno de amor donde los niños aprenden de Jesús a su medida mientras sus padres participan del servicio.",
      image: photos.children,
    },
    {
      title: "Hogares de Avivamiento",
      tag: "Hogares",
      text: "Grupos que se reúnen durante la semana en casas de la ciudad para orar, estudiar la Palabra y compartir la vida. Una iglesia que no cabe en un solo edificio.",
      image: photos.handsUp,
    },
  ]

  function scrollToUsher() {
    document.getElementById("ujieres")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <PageHero
        crumb="Ministerios"
        eyebrow="Una iglesia para todos"
        title="Aquí crecemos"
        accent="juntos."
        intro="Cada ministerio es una forma de servir a Dios y a las personas. Hay un lugar para ti, sin importar tu edad o la etapa en la que estés."
        image={photos.youth}
        position="center 30%"
      />

      <section className="ministry-list section-pad">
        {ministries.map((m, i) => (
          <article
            id={m.title === "Hogares de Avivamiento" ? "hogares" : undefined}
            className={`ministry-row reveal ${i % 2 ? "ministry-row-reverse" : ""}`}
            key={m.title}
          >
            {/* The Kids photo is a small capture: shown at its own size on a playful panel */}
            <figure className={m.title === "MAI Kids" ? "ministry-figure-fit" : undefined}>
              <img src={m.image} alt="" loading="lazy" />
            </figure>
            <div>
              <p className="eyebrow">
                {String(i + 1).padStart(2, "0")} · {m.tag}
              </p>
              <h2>{m.title}</h2>
              <p className="section-intro">{m.text}</p>
              {m.usher ? (
                <button className="button button-primary" onClick={scrollToUsher}>
                  Inscríbete para ser ujier <Icon name="arrow" />
                </button>
              ) : (
                <Button href={to("contacto")} variant="text">
                  Quiero ser parte
                </Button>
              )}
            </div>
          </article>
        ))}
      </section>

      <section id="ujieres" className="prayer usher section-pad">
        <div className="prayer-copy reveal">
          <p className="eyebrow">Ministerio de Servicio</p>
          <h2>
            Inscríbete para
            <br />
            <em>ser ujier.</em>
          </h2>
          <p>
            Servir en la puerta es una forma hermosa de mostrar el amor de Dios. Si te gusta recibir
            a las personas, ayudar y que todo funcione con excelencia, este equipo es para ti.
          </p>
          <ul className="usher-list">
            <li>Recibir con una sonrisa a cada persona que llega</li>
            <li>Acompañar a las visitas nuevas y ubicarlas</li>
            <li>Apoyar el orden durante el servicio y la ofrenda</li>
            <li>Ser parte de un equipo que ora y crece unido</li>
          </ul>
          <blockquote className="usher-verse">
            “Porque mejor es un día en tus atrios que mil fuera de ellos. Escogería antes estar a la
            puerta de la casa de mi Dios, que habitar en las moradas de maldad.”
            <cite>Salmos 84:10</cite>
          </blockquote>
        </div>
        <div className="reveal">
          <UsherForm />
        </div>
      </section>

      <CTA image={photos.worshipRoom} />
    </>
  )
}

function MessagesPage() {
  return (
    <>
      <PageHero
        crumb="Mensajes"
        eyebrow="Mensajes"
        title="Una palabra"
        accent="para tu vida."
        intro="Cada domingo abrimos la Biblia con fe y expectativa. Mensajes que consuelan, confrontan y animan a vivir lo que creemos."
        image={preaching[0]}
        position="center 25%"
      />

      <section className="messages section-pad">
        <div className="featured-message reveal">
          <div className="message-image">
            <img src={preaching[1]} alt="Predicación en Iglesia MAI" />
            <a href={church.youtube} target="_blank" rel="noreferrer" aria-label="Ver prédicas en YouTube">
              <Icon name="play" />
            </a>
          </div>
          <div className="featured-copy">
            <p className="eyebrow">Cada domingo</p>
            <h2>
              La Palabra
              <br />
              <em>en el centro.</em>
            </h2>
            <p>
              Nuestros servicios giran alrededor de la Biblia. Creemos que la Palabra de Dios es
              viva, eficaz y tiene el poder de transformar cualquier vida.
            </p>
            <div className="button-row">
              <Button href={church.youtube} variant="outline" external>
                Prédicas en YouTube
              </Button>
              <Button href={church.instagram} variant="text" external>
                Reels en Instagram
              </Button>
            </div>
          </div>
        </div>

        <div className="preacher-grid">
          {preaching.slice(2).map((src, i) => (
            <figure key={src} className="reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
              <img src={src} alt="Predicación en un servicio de Iglesia MAI" loading="lazy" />
            </figure>
          ))}
        </div>

        <div className="voices">
          <div className="voices-head reveal">
            <p className="eyebrow">Voces que nos enseñan</p>
            <h3>
              Hombres y mujeres que <em>aman la Palabra.</em>
            </h3>
          </div>
          <div className="filmstrip reveal">
            <div className="filmstrip-track">
              {[...voices, ...voices].map((src, i) => (
                <figure key={i} aria-hidden={i >= voices.length || undefined}>
                  <img src={src} alt={i < voices.length ? "Predicación en Iglesia MAI" : ""} loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </div>

        <blockquote className="verse-big reveal">
          “Lámpara es a mis pies tu palabra, y lumbrera a mi camino.”
          <cite>Salmos 119:105</cite>
        </blockquote>
      </section>

      <CTA image={photos.worshipRoom} />
    </>
  )
}

type GalleryTag = "Todas" | "Adoración" | "Palabra" | "Bautizos" | "Comunidad" | "Frases"

const galleryItems: { src: string; tag: Exclude<GalleryTag, "Todas"> }[] = [
  { src: photos.worshipRoom, tag: "Adoración" },
  { src: baptisms[0], tag: "Bautizos" },
  { src: preaching[0], tag: "Palabra" },
  { src: photos.embrace, tag: "Comunidad" },
  { src: photos.worshipLeader, tag: "Adoración" },
  { src: baptisms[1], tag: "Bautizos" },
  { src: photos.prayer, tag: "Comunidad" },
  { src: preaching[1], tag: "Palabra" },
  { src: photos.praise, tag: "Adoración" },
  { src: baptisms[2], tag: "Bautizos" },
  { src: photos.handsUp, tag: "Adoración" },
  { src: preaching[2], tag: "Palabra" },
  { src: photos.youth, tag: "Comunidad" },
  { src: baptisms[3], tag: "Bautizos" },
  { src: preaching[3], tag: "Palabra" },
  { src: baptisms[4], tag: "Bautizos" },
  { src: preaching[4], tag: "Palabra" },
  { src: baptisms[5], tag: "Bautizos" },
  { src: preaching[5], tag: "Palabra" },
  { src: photos.greatLove, tag: "Comunidad" },
  { src: preaching[6], tag: "Palabra" },
  { src: photos.exalt, tag: "Adoración" },
  { src: photos.menPraying, tag: "Comunidad" },
  { src: voices[1], tag: "Palabra" },
  { src: photos.womanPraying, tag: "Comunidad" },
  { src: voices[0], tag: "Palabra" },
  { src: photos.couplePraying, tag: "Comunidad" },
  { src: voices[2], tag: "Palabra" },
  { src: photos.congregation, tag: "Palabra" },
  { src: voices[3], tag: "Palabra" },
  { src: voices[4], tag: "Palabra" },
  { src: voices[5], tag: "Palabra" },
  { src: voices[6], tag: "Palabra" },
  { src: voices[7], tag: "Palabra" },
  ...phrases.map((src) => ({ src, tag: "Frases" as const })),
]

function GalleryPage() {
  const [tag, setTag] = useState<GalleryTag>("Todas")
  const [viewer, setViewer] = useState<number | null>(null)
  const items = tag === "Todas" ? galleryItems : galleryItems.filter((g) => g.tag === tag)
  const tags: GalleryTag[] = ["Todas", "Adoración", "Palabra", "Bautizos", "Comunidad", "Frases"]

  const close = useCallback(() => setViewer(null), [])
  const move = useCallback(
    (d: number) => setViewer((v) => (v === null ? v : (v + d + items.length) % items.length)),
    [items.length],
  )

  return (
    <>
      <PageHero
        crumb="Galería"
        eyebrow="Experiencia MAI"
        title="Somos una"
        accent="familia."
        intro="Momentos de adoración, Palabra, bautizos y comunidad. Más que asistir a una reunión, queremos caminar juntos."
        image={photos.praise}
        position="center 30%"
      />

      <section className="gallery section-pad">
        <div className="gallery-toolbar">
          <div className="gallery-filters" role="tablist">
            {tags.map((t) => (
              <button key={t} className={tag === t ? "is-active" : ""} onClick={() => setTag(t)} role="tab" aria-selected={tag === t}>
                {t}
                <small>{t === "Todas" ? galleryItems.length : galleryItems.filter((g) => g.tag === t).length}</small>
              </button>
            ))}
          </div>
          <Button href={church.instagram} variant="primary" external>
            <Icon name="instagram" /> Síguenos en Instagram
          </Button>
        </div>
        <div className="masonry" key={tag}>
          {items.map((item, i) => (
            <button key={item.src} className="masonry-item" style={{ animationDelay: `${Math.min(i, 12) * 0.05}s` }} onClick={() => setViewer(i)} aria-label={`Ampliar foto de ${item.tag}`}>
              <img src={item.src} alt={item.tag} loading="lazy" />
              <span>{item.tag}</span>
            </button>
          ))}
        </div>
      </section>

      {viewer !== null && <Lightbox src={items[viewer].src} count={`${viewer + 1} / ${items.length}`} onClose={close} onMove={move} />}
    </>
  )
}

function Lightbox({
  src,
  count,
  onClose,
  onMove,
}: {
  src: string
  count: string
  onClose: () => void
  onMove: (d: number) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") onMove(1)
      if (e.key === "ArrowLeft") onMove(-1)
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose, onMove])

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <img src={src} alt={`Foto de la galería MAI ${count}`} onClick={(e) => e.stopPropagation()} />
      <button className="lightbox-close" onClick={onClose} aria-label="Cerrar">
        <Icon name="close" />
      </button>
      <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); onMove(-1) }} aria-label="Foto anterior">
        <Icon name="arrow" />
      </button>
      <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); onMove(1) }} aria-label="Foto siguiente">
        <Icon name="arrow" />
      </button>
      <span className="lightbox-count">{count}</span>
    </div>
  )
}

function PrayerForm() {
  const [sent, setSent] = useState(false)
  const { sending, error, send } = useSend()
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    send(async () => {
      await saveSubmission("oracion", {
        name: String(f.get("name") || ""),
        contact: [f.get("email"), f.get("phone")].filter(Boolean).join(" · "),
        request: String(f.get("prayer") || ""),
        wantsCall: f.get("contact") === "on",
      })
      setSent(true)
    })
  }
  if (sent) {
    return (
      <div className="form-success">
        <span>Gracias</span>
        <h3>Recibimos tu petición.</h3>
        <p>Nuestro equipo de intercesión orará por ti con cuidado y confidencialidad.</p>
        <PreviewNote />
        <button onClick={() => setSent(false)}>Enviar otra petición</button>
      </div>
    )
  }
  return (
    <form className="prayer-form" onSubmit={submit}>
      <div className="form-row">
        <label>
          Nombre
          <input required name="name" placeholder="Tu nombre" />
        </label>
        <label>
          Correo
          <input required type="email" name="email" placeholder="tu@correo.com" />
        </label>
      </div>
      <label>
        Teléfono <span>Opcional</span>
        <input name="phone" type="tel" placeholder="+57" />
      </label>
      <label>
        Petición de oración
        <textarea required name="prayer" rows={4} placeholder="Cuéntanos cómo podemos orar por ti..." />
      </label>
      <label className="check">
        <input type="checkbox" name="contact" />
        <span>Quiero que alguien del equipo me contacte</span>
      </label>
      <SendError show={error} />
      <button className="submit-button" type="submit" disabled={sending}>
        {sending ? "Enviando…" : "Enviar petición"} <Icon name="arrow" />
      </button>
      <p className="privacy">Tu información es privada. No la compartiremos con terceros.</p>
    </form>
  )
}

function LocationSection() {
  return (
    <section id="ubicacion" className="location section-pad">
      <div className="location-map reveal">
        <iframe title="Mapa de Iglesia MAI" src={church.mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="location-info reveal">
        <p className="eyebrow">Visítanos</p>
        <h2>
          Estamos en
          <br />
          <em>Bogotá.</em>
        </h2>
        <div className="location-detail">
          <Icon name="pin" />
          <p>
            {church.address}
            <br />
            <span>{church.area}</span>
          </p>
        </div>
        <div className="location-detail">
          <Icon name="clock" />
          <p>
            Domingos 8:00 AM
            <br />
            Domingos 10:00 AM
          </p>
        </div>
        <Button href={church.maps} external>
          Cómo llegar
        </Button>
      </div>
    </section>
  )
}

function ContactPage() {
  return (
    <>
      <PageHero
        crumb="Contacto"
        eyebrow="No caminas solo"
        title="Queremos orar"
        accent="contigo."
        intro="Si estás pasando por una situación, tienes una petición o quieres conocer más de MAI, escríbenos. Será un honor acompañarte."
        image={photos.prayer}
        position="center 30%"
      />

      <section className="prayer section-pad">
        <div className="prayer-copy reveal">
          <p className="eyebrow">Petición de oración</p>
          <h2>
            Cuéntanos
            <br />
            <em>cómo orar.</em>
          </h2>
          <p>
            Nuestro equipo de oración leerá tu petición con cuidado y amor. Si lo deseas, alguien de
            la iglesia se pondrá en contacto contigo.
          </p>
          <div className="contact-list">
            <a href={church.instagram} target="_blank" rel="noreferrer">
              <Icon name="instagram" />
              <span>
                <small>Instagram</small>
                {church.handle}
              </span>
            </a>
            <a href={church.tiktok} target="_blank" rel="noreferrer">
              <Icon name="tiktok" />
              <span>
                <small>TikTok</small>
                @maiiglesia
              </span>
            </a>
            <a href={church.maps} target="_blank" rel="noreferrer">
              <Icon name="pin" />
              <span>
                <small>Dirección</small>
                {church.address}
              </span>
            </a>
            <div>
              <Icon name="clock" />
              <span>
                <small>Servicios</small>
                Domingos 8:00 y 10:00 AM
              </span>
            </div>
            <button onClick={() => openWidget("visita")}>
              <Icon name="users" />
              <span>
                <small>¿Te da pena llegar sin conocer a nadie?</small>
                Quiero que alguien me invite
              </span>
            </button>
          </div>
          <div className="help-now" role="note">
            <strong>¿Necesitas hablar con alguien ahora mismo?</strong>
            <span>
              Si estás pasando por un momento muy difícil, no lo enfrentes solo. En Bogotá llama a la{" "}
              <a href="tel:106">Línea 106</a> (apoyo emocional, gratuita, 24 horas). En una emergencia, al{" "}
              <a href="tel:123">123</a>.
            </span>
          </div>
        </div>
        <div className="reveal">
          <PrayerForm />
        </div>
      </section>

      <LocationSection />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

function PublicSite() {
  const [route, setRoute] = useState<Route>(readRoute())
  const [section, setSection] = useState(readSection())

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute())
      setSection(readSection())
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = pages.find((p) => p.route === route)?.title ?? "Iglesia MAI · Bogotá"

    const observer = new IntersectionObserver(
      (entries) => {
        // Elements entering together (a grid row) cascade in one after another
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, i) => {
            const el = entry.target as HTMLElement
            if (!el.style.transitionDelay) el.style.transitionDelay = `${Math.min(i, 5) * 0.08}s`
            el.classList.add("is-visible")
            observer.unobserve(el)
          })
      },
      { threshold: 0.12 },
    )
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [route])

  // "#/page/section" links land on that section once the page has rendered
  useEffect(() => {
    if (!section) return
    const id = window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth" }), 120)
    return () => window.clearTimeout(id)
  }, [route, section])

  // Hero photos drift slower than the page while scrolling (gentle parallax)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const images = Array.from(document.querySelectorAll<HTMLElement>(".hero > img, .hero > video, .page-hero > img, .cta > img"))
    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      images.forEach((img) => {
        const box = img.parentElement!.getBoundingClientRect()
        if (box.bottom < 0 || box.top > vh) return
        // Kept within the extra room the CSS scale gives the photo, so no edge ever shows
        const limit = box.height * 0.06
        const shift = Math.max(-limit, Math.min(limit, (box.top + box.height / 2 - vh / 2) * -0.1))
        img.style.translate = `0 ${Math.round(shift)}px`
      })
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [route])

  const Page = {
    "": HomePage,
    nosotros: AboutPage,
    reuniones: MeetingsPage,
    ministerios: MinistriesPage,
    mensajes: MessagesPage,
    galeria: GalleryPage,
    contacto: ContactPage,
  }[route]

  return (
    <>
      <Navbar route={route} />
      <main id="contenido" tabIndex={-1} className="page" key={route}>
        <Page />
      </main>
      <Footer />
      <FloatingActions />
      <AnnouncementPopup />
    </>
  )
}

export default function App() {
  // "?acceso=recuperar" is where the staff password-reset email lands (see lib/auth.ts).
  const isPrivateRoute = () =>
    /^#\/(admin|registro|inscripcion)/.test(window.location.hash) || window.location.search.includes("acceso=recuperar")
  const [adminMode, setAdminMode] = useState(isPrivateRoute())

  useEffect(() => {
    const onHashChange = () => setAdminMode(isPrivateRoute())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    document.documentElement.lang = "es"
    if (adminMode) document.title = "Gestión Interna · Iglesia MAI"
    const manifest =
      document.querySelector<HTMLLinkElement>('link[rel="manifest"]') ||
      document.createElement("link")
    manifest.rel = "manifest"
    manifest.href = "/manifest.webmanifest"
    if (!manifest.parentNode) document.head.appendChild(manifest)
    const theme =
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ||
      document.createElement("meta")
    theme.name = "theme-color"
    theme.content = adminMode ? "#0B1220" : "#123B4A"
    if (!theme.parentNode) document.head.appendChild(theme)
  }, [adminMode])

  if (adminMode) {
    return (
      <Suspense
        fallback={
          <div className="app-loading">
            <img src="/logo-mai-white.png" alt="Iglesia MAI" />
            <p>Cargando gestión MAI...</p>
          </div>
        }
      >
        <AdminApp
          onExit={() => {
            if (window.location.search) history.replaceState(null, "", window.location.pathname)
            window.location.hash = "#/"
          }}
        />
      </Suspense>
    )
  }

  return <PublicSite />
}

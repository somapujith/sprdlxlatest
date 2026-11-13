import { Icon } from "@/components/Icon";
import { site } from "@/data/site";
import styles from "./ConnectedEarthSection.module.css";

export function ConnectedEarthSection() {
  return (
    <section id="connected-earth" className={styles.section} aria-labelledby="connected-earth-heading">
      <div className={styles.layout}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true"></span>From India, outward
          </p>
          <h2 id="connected-earth-heading">
            Rooted in India.
            <br />
            <span>Built to travel.</span>
          </h2>
          <ol className={styles.connections} aria-label="Example cities on the network">
            {site.cities.map((city) => (
              <li key={city.name}>{city.name}</li>
            ))}
          </ol>
          <p className={styles.credit}>Earth imagery courtesy of NASA / GSFC</p>
        </div>
        <div className={styles.invitation}>
          <p>
            AI, brand and venture building in one place, aimed at markets well beyond home. Got something
            brewing? Bring it to us.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} data-contact="true" href={`mailto:${site.contactEmail}`} aria-haspopup="dialog">
              Pitch your idea <Icon />
            </a>
            <a className={styles.secondary} href="#projects">
              See the ventures <Icon name="arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ConnectedEarthSection;

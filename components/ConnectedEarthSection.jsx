import { Icon } from "@/components/Icon";
import { site } from "@/data/site";
import styles from "./ConnectedEarthSection.module.css";

export function ConnectedEarthSection() {
  return (
    <section id="connected-earth" className={styles.section} aria-labelledby="connected-earth-heading">
      <div className={styles.layout}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true"></span>A global outlook
          </p>
          <h2 id="connected-earth-heading">
            Built here.
            <br />
            <span>Connected everywhere.</span>
          </h2>
          <ol className={styles.connections} aria-label="Illustrative international connections">
            {site.cities.map((city) => (
              <li key={city.name}>{city.name}</li>
            ))}
          </ol>
          <p className={styles.credit}>Earth imagery · NASA / GSFC</p>
        </div>
        <div className={styles.invitation}>
          <p>
            We bring AI, design and venture building together to help companies grow beyond borders. Have an
            idea? Let’s build what comes next.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} data-contact="true" href={`mailto:${site.contactEmail}`} aria-haspopup="dialog">
              Build with us <Icon />
            </a>
            <a className={styles.secondary} href="#projects">
              Explore our projects <Icon name="arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ConnectedEarthSection;

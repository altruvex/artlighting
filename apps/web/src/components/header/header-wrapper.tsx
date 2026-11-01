import { APPLICATIONS } from "@/content/applications"
import Header from "./header"

/**
 * The header's server entry. The applications menu needs only each
 * application's slug, name and summary; importing the whole content file
 * into the client header shipped ~21 KB of bilingual page copy to every
 * visitor. It is trimmed here, on the server.
 */
const menuApplications = APPLICATIONS.map(({ slug, name, summary }) => ({ slug, name, summary }))

const HeaderWrapper = () => <Header applications={menuApplications} />

export default HeaderWrapper

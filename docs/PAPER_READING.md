# Paper reading

Paper reading turns K-Plex into a literature map: see what a paper cites and who cites it, read abstracts in the original or side by side with a translation, and add papers to your vault with one click.

## Turn it on

**Settings → K-Plex → Paper reading → Enable paper reading.**

The first time you enable it, K-Plex explains which services it contacts and registers the **References** property as a parent relationship field. Turning the switch off hides every paper feature; notes you have added stay ordinary notes.

## Which notes are papers

A node is a paper when one of the **Identifier properties** (default: `doi, DOI, arxiv, arXiv, url, source`) contains:

| Example value | Recognized as |
| --- | --- |
| `10.1038/nature14539`, `doi:10.1038/…`, `https://doi.org/10.1038/…` | DOI |
| `arXiv:2104.09864`, `2104.09864v2`, `https://arxiv.org/abs/2104.09864`, `https://arxiv.org/pdf/…` | arXiv |
| `10.48550/arXiv.2104.09864` | arXiv |
| `https://www.semanticscholar.org/paper/…/<id>` | Semantic Scholar |

A note whose identifier property links the paper somewhere else, for example a CVPR or NeurIPS PDF, is matched by its `title` property instead.

doi.org and arxiv.org link nodes in the Plex are papers too.

## Paper details

Right-click a paper node and choose **Paper details…**, or run **K-Plex: Show paper details** for the current center node.

Details open in the K-Plex **sidecar**, beside the Plex, so you can keep browsing the graph. The sidecar is created if it is not open. When K-Plex is in a side panel, or **Show paper details in the sidecar** is off, a dialog is used instead.

- **Header**: title, authors, venue, year, citation and reference counts, plus DOI, arXiv, PDF and Semantic Scholar links.
- **Abstract**: switch between **Original**, **Bilingual** (each sentence paired with its translation) and translation only (for example **简体中文**). Translation only also shows translated titles in the header and the lists. Your choice is remembered.
- **This paper's actions**:
  - When the paper has a note: **Show in Plex** centers it in the graph. **Save to note** adds paper properties the note is missing (authors, year, venue, ids, citations; existing values are never changed) and appends the abstract and translation without duplicating sections.
  - When it does not: **Add to vault** creates its note. If you reached it from another paper's list, it is linked as that paper's reference or citing paper; otherwise it is added on its own. This also works for doi.org / arxiv.org link nodes.
- **References** and **Cited by**: paged lists you can filter by title, author or year. Each row shows year, first author, venue and citation count. The line above the list shows where it came from: K-Plex uses Semantic Scholar first, then OpenAlex, then, for references, the reference section in the paper's own note (useful for notes that contain the paper's full text, and when offline services have no list). References parsed from a note are matched to your vault by arXiv id or DOI when the entry cites one.
  - Click a title to show that paper's own details, references and citing papers. **Back** returns to the previous paper.
  - The arrow button previews the abstract inline.
  - **In vault** means you already have a note for it; the locate button shows it in the Plex.
  - **Linked** means the relationship is already recorded.
  - **Add to vault** creates a paper note and links it. **Link** connects a note you already have.
  - Select several rows and use **Add selected**, or use **Link all in vault**. Bulk actions show progress and can be cancelled.

## Full text

**Import full text** saves the whole article as a Markdown note. Choose the method under **Settings → Paper reading → Full text**:

- **Built-in import** (arXiv papers): converts arXiv's HTML version to Markdown. Formulas stay as LaTeX (`$…$` and `$$…$$`), the reference list is kept, and page chrome is removed. Progress is shown on the button.
- **Obsidian Web Clipper**: opens the article in your browser so you can clip it with the Web Clipper extension. The clipper's template decides the note location and format. This also works for DOI papers.

Built-in import options:

- **Article folder**: where articles are saved (default `Papers/Articles`).
- **Download images**: saves figures to the **Image folder** (default `images`) and embeds them with `![[…]]`. When off, figures link to the web.
- **Full-text property** (default `Full text`): when the paper already has a note, the article is saved as a separate note and linked from the paper note through this property, so it appears below the paper. When the paper has no note yet, the article note becomes the paper's note, with its metadata.

## Double-click in the Plex

- Double-clicking a **paper node** other than the center shows its Paper details in the sidecar. The center node still opens its note. Turn this off with **Double-click shows paper details**.
- Double-clicking an **image node** opens the image in the sidecar.

Figures embedded in articles appear as image nodes. Use **Images** in the filter popover (or **Settings → Plex behavior → Images**) to show or hide them without hiding other attachments.

## How papers are connected

Links are stored in the **Reference property** (default `References`) of the citing paper:

```yaml
References:
  - "[[Vaswani 2017 - Attention Is All You Need]]"
```

Because it is a parent field, a paper's references appear **above** it in the Plex and papers citing it appear **below**. If the two notes were already connected some other way, that relationship is kept and the reference is added beside it.

## Added paper notes

Added papers go to the **Paper folder** (default `Papers`) and are named `First-author-surname Year - Title`. Each note records `title`, `aliases`, `authors`, `year`, `venue`, `doi`/`arxiv`, `url`, `pdf`, `citations`, and your style property set to **Note type for added papers** (default `Paper`), so paper nodes can be styled and filtered. The body contains the abstract. If **Translate when adding papers** is on, or you already translated the abstract, it also contains the translation.

**Abstract format in notes**:

- **Original and translation sections**: `## Abstract` followed by `## 摘要（简体中文）`.
- **Sentence-by-sentence bilingual**: each sentence followed by its translation as a quote line.
- **Translation only**: just the translated section, for example `## 摘要（简体中文）`. If no translation is available, the original is saved.

## Translation

Choose **Google Translate** or **Bing Translator** and the target language. If the chosen service fails, K-Plex tries the other one automatically. Translations are kept for the current session, so switching views does not translate again. **Translate paper titles** adds a translated line under each title in the lists.

## Privacy and services

Paper reading is the only K-Plex feature that uses the network, and only after you enable it and open Paper details.

| Service | Used for | What is sent |
| --- | --- | --- |
| Semantic Scholar | Paper details, references, citing papers, title matching | The paper's DOI, arXiv id or title |
| OpenAlex | Fallback details, references and citing papers | The DOI or title (and your contact email, if set) |
| arXiv | Fallback abstracts for arXiv papers; full-text import and figures | The arXiv id |
| Google Translate / Bing Translator | Translation | The abstract or title text being translated |

The translators are the services' public web endpoints. They can be rate limited or change without notice; if both fail, the abstract shows an error with **Retry**.

Semantic Scholar limits anonymous requests. For smoother use, request a free API key from Semantic Scholar, store it with Obsidian's secret storage, and choose it under **Semantic Scholar API key**.

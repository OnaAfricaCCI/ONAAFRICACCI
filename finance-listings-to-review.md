# Finance and investment listings, for review

Researched 25 September 2026. Every figure below was read off the funder's own
page on that date, and the source URL is given for each. Nothing here has been
published. Tick or strike each line, and Claude will enter the ones you approve.

Two house rules applied throughout:

- **"Up to" is a ceiling.** Where a funder writes "up to", it stays.
- **A facility is not money paid out.** Where a figure is the size of a lending
  window rather than money that has reached creatives, it says so.

Where a page does not state something, the line reads *Not stated by the
funder* rather than being filled in from elsewhere.

---

## 1. BOI NollyFund

**Recommend: add.** A real, named loan product with amounts on the page.

| Field | Value |
|---|---|
| Name | BOI NollyFund |
| Funder | Bank of Industry (Nigeria) |
| Instrument | **Loan** |
| Amount | Programme limit of ₦1 billion. Up to ₦50 million per borrower. |
| Eligibility | Companies engaged in film production, with a commercially viable script and a track record of successful productions. Applicant must sign with a reputable distributor who issues a Minimum Guarantee, and provide a cash deposit of 5% of the loan amount. |
| Countries | Nigeria |
| Sector | Film |
| Deadline | Not stated by the funder. Treat as rolling. |
| Interest rate | Not stated by the funder |
| Tenor | Not stated by the funder |
| Source | https://www.boi.ng/bank-of-industry-introduces-nollyfund/ |

**Two things you should know before approving.**

The page BOI tells applicants to visit, `boi.ng/nollyfund`, now returns 404. The
page above is BOI's own announcement and is the fullest description still
standing. Listing it sends people to a real description on the bank's own site,
but not to an application form, because there is not one to send them to.

You already list a grant called **"BOI NollyFund and creative loans"** whose
link is currently flagged. If you approve this, the two should be merged rather
than run side by side.

---

## 2. Creative Industry Financing Initiative (CIFI)

**Recommend: correct the listing you already have.** This is not a new record.

| Field | Value on the funder's page |
|---|---|
| Name | Creative Industry Financing Initiative (CIFI) |
| Funder | Central Bank of Nigeria and the Bankers' Committee, established 2018 |
| Instrument | **Loan** |
| Amount | ₦3 million to ₦50 million for fashion, information technology, movie and music. ₦500 million for movie distribution. |
| Eligibility | Existing enterprises in the creative industry, start-ups in the creative industry, and students of higher institutions engaged in software development. |
| What it funds | Training, equipment, and rental or service fees for fashion and ICT entrepreneurs |
| Countries | Nigeria |
| Deadline | Not stated by the funder |
| How to apply | "To apply for CIFI, please visit your PFIs" (participating financial institutions) |
| Source | https://www.cbn.gov.ng/DFD/msmes/cifi.html |

Your listing was corrected yesterday and already carries the right amounts. The
one thing still missing is the application route: there is no online form, and
applicants must go through a participating bank. Worth adding to the
description so nobody hunts for an application link that does not exist.

---

## 3. HEVA — Ota Kopa and Ota Kopa Plus

**Recommend: add.** The clearest finance product of the set, with rates on the
page.

| Field | Value |
|---|---|
| Name | Ota Kopa and Ota Kopa Plus |
| Funder | HEVA Fund |
| Instrument | **Loan** |
| Amount | Ota Kopa: up to KES 999,999. Ota Kopa Plus: up to KES 4,999,999. |
| Interest rate | 9% |
| Eligibility | Creatives and creative businesses across multiple disciplines. The same criteria apply across every provider. |
| Countries | Kenya |
| Deadline | Not stated by the funder. The programme runs 2025 to 2027. |
| How to apply | Not directly to HEVA. Through approved providers: Kenya Bankers, Longitude Capital or Tenakata, or through aggregators Wowzi (content creators) and Shop Zetu (fashion). |
| Source | https://www.hevafund.com/ota-kopa-loans |

The application route matters here and belongs in the description. Someone who
approaches HEVA directly will be turned away.

---

## 4. HEVA — Sanara

**Recommend: your call.** It is a programme rather than a single instrument, and
several details are not published.

| Field | Value |
|---|---|
| Name | Sanara |
| Funder | HEVA Fund |
| Instrument | Mixed: loans (Ota), grants, training, business development and mentorship |
| Amount | **Not stated by the funder** |
| Eligibility | Young women and men aged 18 to 35. Targets named on the page: 77,000 young women, 11,000 refugees, 5,500 people with disabilities. |
| Countries | Kenya, in six counties: Kakamega, Kisumu, Mombasa, Nairobi, Nakuru and Turkana |
| Sectors | Fashion, garments and accessories. Film, television, content creation, gaming and audiovisual. Live music, theatre and performing arts. |
| Deadline | Not stated by the funder. Programme runs 2024 to 2027. |
| How to apply | Opportunities are posted on the site as they open |
| Source | https://www.hevafund.com/sanara |

With no amount published and no standing call, this sits closer to a programme
than an opportunity. Your `is_opportunity` rule would probably reject it. My
inclination is to leave it out until a specific call opens, but it is a real
programme and you may want it visible.

---

## 5. CANEX (Creative Africa Nexus)

**Recommend: do not list as an opportunity.** List Afreximbank as a funder
instead, if it is not already there.

| Field | Value |
|---|---|
| Name | Creative Africa Nexus (CANEX) |
| Funder | Afreximbank |
| Instrument | A programme, offering financing and non-financing instruments |
| Amount | A **facility** of up to US$2 billion for 2024 to 2027, raised from US$1 billion. This is lending capacity, not money disbursed. |
| Countries | Africa and the diaspora |
| How to apply | No single application route. Individual CANEX calls open separately. |
| Source | Afreximbank announcements, mirrored at https://cms.canex.africa/ |

**Why not list it.** CANEX is an umbrella, not a call you can apply to. Your own
extraction rule rejects "pages that list or link to many opportunities", and it
would be right to. The individual CANEX calls, such as CANEX Shorts or the
prizes at CANEX WKND, are the listable items, and you already carry two of them.

**A practical note.** `afreximbank.com` returns 403 to any automated request, so
Apify cannot read it. `cms.canex.africa` is the same content and is readable.
Use that domain for anything Afreximbank.

---

## 6. Africa Film Fund — one to watch, not to list

| Field | Value |
|---|---|
| Name | Africa Film Fund |
| Funder | Afreximbank, through FEDA, under CANEX |
| Amount | "up to US$1 billion" |
| What it finances | Film and TV development and production, studios and post-production infrastructure, distribution platforms and exhibition networks, technology and innovation |
| Announced | May 2025 |
| Status | **Not open.** Being operationalised. |
| Source | https://cms.canex.africa/africa-film-fund/ |

The fund's own page says, word for word:

> "Further details, including investment parameters and application guidelines,
> will be shared in due course."

Listing it now would put a billion-dollar headline on the site against something
nobody can apply to. Worth checking again in a few months.

---

## What could not be researched, and why

| Source | Problem |
|---|---|
| i-DICE (idice.ng) | The site returns 101 characters of text. It is built entirely in JavaScript, so neither Apify nor this research can read it. |
| afreximbank.com | Returns 403 to automated requests. Blocks bots outright. |
| fedagroup.org (FEDA) | Returns 403. |
| canex.africa/africa-film-form | 17 characters of text. JavaScript-rendered. |

i-DICE is the notable loss: a US$617.7 million Nigerian programme covering
digital and creative enterprises, with a Founders Lab for people aged 18 to 35.
Everything about it is real. None of it is machine-readable. If you want it
listed, someone has to read the site in a browser and type the details in.

---

## The pattern worth noticing

Grants live on foundation websites, which are plain, static and readable.
Finance lives on bank websites, which are JavaScript applications behind bot
protection. That is structural rather than bad luck, and it means the ingestion
pipeline will systematically under-collect the category you have just put in
your homepage headline.

For finance, hand entry is the realistic route. The upside is that these
products change over years rather than weeks, so they stay current far longer
than a grant call does.

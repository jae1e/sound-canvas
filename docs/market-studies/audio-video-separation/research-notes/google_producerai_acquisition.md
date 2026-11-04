# Google's acquisition of ProducerAI (formerly Riffusion)

Research date: 2026-11-04. Labels: [fact] means a primary page or reputable press; [vendor claim]; [secondary] means a single secondary outlet; [hypothesis] means my inference.

## Takeaway

On 2026-02-24 Google brought ProducerAI and its team into Google Labs and Google DeepMind. The terms were not disclosed. Google already had a strong music model (Lyria 3) but no dedicated creation app. ProducerAI brought an iterative, agent-style music workflow, an existing user base, and a team that had built and shipped its own music models. Google then replaced ProducerAI's own model with Lyria 3, renamed the product Google Flow Music in April 2026, and gave it artist distribution through Believe and TuneCore in May 2026. What Google kept was the product and the team, not the startup's model [hypothesis, from the sequence of events].

## How it happened

- **2022-12-15:** Seth Forsgren and Hayk Martiros release Riffusion as an open-source hobby project. It fine-tuned Stable Diffusion 1.5 on spectrogram images and converted the generated images back into audio, and it went viral [secondary]. ([awesomeagents](https://awesomeagents.ai/news/producerai-joins-google-labs/))
- **2023:** $4M seed round. Sources disagree on the lead: one says Greycroft, while Sky9 Capital says it led, with South Park Commons and Greycroft participating. The Chainsmokers are backers or advisers [fact, vendor; conflicting]. ([Sky9](https://www.sky9capital.com/news/sky9-capital-portfolio-company-producerai-acquired-by-google/), [TechCrunch 2026-02-24](https://techcrunch.com/2026/02/24/music-generator-producerai-joins-google-labs/))
- **2025-01:** Riffusion ships its own FUZZ model.
- **2025-07:** Riffusion rebrands to Producer.ai, with an agent workflow and FUZZ-2.0 [secondary].
- **Before the deal:** The product reportedly had about 1M monthly users. This comes from a single secondary source and is unverified [secondary]. ([awesomeagents](https://awesomeagents.ai/news/producerai-joins-google-labs/))
- **2026-02-18:** Google launches Lyria 3 in the Gemini app, with 30-second clips [fact via press].
- **2026-02-24:** Google Labs Senior Director Elias Roman posts "ProducerAI: Your music creation partner, now in Google Labs" [fact]. ([Google blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/producerai/))
  - The post says ProducerAI is "joining" Google Labs and never uses the word "acquisition". The press reports it as an acquisition. ([Music Business Worldwide](https://www.musicbusinessworldwide.com/google-acquires-ai-music-platform-and-suno-challenger-producerai), [Billboard](https://www.billboard.com/pro/google-acquires-producerai-ai-music-startup/))
  - The team joined Google Labs and DeepMind, according to a LinkedIn post by ProducerAI's Kendall Rankin [secondary]. ([Music in Africa](https://www.musicinafrica.net/node/383963))
  - The product kept running on a preview of Lyria 3, alongside Gemini, Veo and Nano Banana, with SynthID watermarks on all outputs [fact].
  - Price and terms were not disclosed [fact].
- **2026-04 (reported 2026-04-20):** ProducerAI is renamed Google Flow Music (flowmusic.app) and joins the Flow product family alongside the Flow video tool. It adds section replace and extend features [fact via press]. ([9to5Google](https://9to5google.com/2026/04/20/producerai-becomes-google-flow-music/))
- **2026-05-06:** Google partners with Believe and TuneCore. Seth Forsgren writes the Google post, so the founder is still involved. Artists get Flow Music with Lyria 3 Pro and weekly feedback sessions with Google's product team. Google says it "doesn't claim ownership of the original content generated with Flow Music" [fact]. ([Google blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/believe-flow-music-partnership/), [MBW](https://www.musicbusinessworldwide.com/believe-partners-with-google-to-offer-ai-music-creation-tool-flow-music-to-its-artists/))
- **2026-05-19 (Google I/O):** The iOS app is reported. One source says Android was still pending. I found no confirmation of a Google Play release, so this needs checking [secondary].
- **2026-07-29:** Lyria 3.5 ships, available only inside Flow Music, with better vocals and tempo and duration controls [fact via press]. ([Google blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/lyria-3-5/), [Android Authority](https://androidauthority.com/google-lyria-3-5-launch-3692517))

## Why Google did it

Google's only stated rationale is a shared mission of "empowering artists of every level to create the music they imagine", plus a focus on artist control and "Spaces" (natural-language instruments and effects that can be shared and remixed) [vendor claim]. The reasons below are inferences [hypothesis]:

1. **Google had the model but not the product.** Lyria 3 in Gemini was a 30-second novelty. ProducerAI was a full creation workflow built over about three years. Roman frames it as a "collaboration partner", not a one-click generator.
2. **Speed against Suno.** Suno reportedly raised $250M at a $2.45B valuation in November 2025, with about $200M in annual revenue [fact via press]. Buying an existing app and its users was faster than building one from scratch.
3. **The team.** It combined ML researchers who had trained music models with musicians, and it went into DeepMind as well as Labs.
4. **Lower rights risk.** The product moved onto Google's own Lyria, which Google says it developed with the music community, and added SynthID. The industry partnership (Believe and TuneCore) followed within three months.
5. **The acquirer's pattern.** Elias Roman co-founded Songza, which Google acquired in 2014, and later worked on Google Play Music and YouTube Music [fact for the Songza acquisition; the career details are secondary].

## Relevance to our screening

The pattern for a small team is to sit on top of a big company's model category, own the workflow and the users, and be bought for the product and the team rather than the model. For the "audio rescue" idea, built on Meta's SAM Audio, the value that might interest an acquirer would be the workflow, the users and the data, not the separation model [hypothesis]. Related: the user's acquisition-target direction (2026-11-03).

## Gaps

- No price, valuation, revenue or verified user count for ProducerAI.
- Google Play availability is unconfirmed.
- The exact rename date in April 2026 is uncertain.
- MBW and Billboard pages were not readable (403 or paywall); their details come from search snippets.

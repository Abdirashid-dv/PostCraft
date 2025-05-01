document
    .getElementById("generate-button")
    .addEventListener("click", async () => {
        const resultContainer = document.getElementById("result-container");
        const resultDiv = document.getElementById("result-box");

        // Show loading state
        resultDiv.innerHTML =
            '<div class="loading"><div class="loader"></div></div>';
        resultDiv.classList.remove("result-placeholder");

        const generation_type =
            document.querySelector("#type-generation").value;

        chrome.storage.sync.get(["apiKey"], async (data) => {
            if (!data.apiKey) {
                resultDiv.innerHTML =
                    '<div class="error"><i class="fas fa-exclamation-circle"></i> Please set your API key in the settings.</div>';
                return;
            }

            try {
                const [tab] = await chrome.tabs.query({
                    active: true,
                    currentWindow: true,
                });

                if (!tab) {
                    resultDiv.innerHTML =
                        '<div class="error"><i class="fas fa-exclamation-circle"></i> No active tab found.</div>';
                    return;
                }

                chrome.tabs.sendMessage(
                    tab.id,
                    { type: "GET_POST_CONTENT" },
                    async (response) => {
                        const lastError = chrome.runtime.lastError;
                        if (lastError) {
                            console.error("Error:", lastError.message);
                            resultDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Connection error: ${lastError.message}<br>Try refreshing the page.</div>`;
                            return;
                        }

                        if (!response || !response.content) {
                            resultDiv.innerHTML =
                                '<div class="error"><i class="fas fa-exclamation-circle"></i> Unable to retrieve post content.</div>';
                            return;
                        }

                        const postContent = response.content.trim();

                        if (!postContent) {
                            resultDiv.innerHTML =
                                '<div class="error"><i class="fas fa-exclamation-circle"></i> No content found in the post.</div>';
                            return;
                        }

                        // Display the content
                        try {
                            const result = await getGeminiEnhancedContent(
                                postContent,
                                generation_type,
                                data.apiKey
                            );

                            if (generation_type === "comment-generation") {
                                const parsedResult = JSON.parse(
                                    removeJsonCodeBlocks(result)
                                );
                                const mainComment = parsedResult.main_comment;
                                const recommendedComments =
                                    parsedResult.recommended_comments
                                        .map((comment) => `<li>${comment}</li>`)
                                        .join("");

                                resultDiv.innerHTML = `
                                    <div class="result">
                                        <strong><i class="fas fa-comment"></i> Main Comment</strong>
                                        <p>${mainComment}</p>
                                        <strong><i class="fas fa-lightbulb"></i> Alternative Comments</strong>
                                        <ul>${recommendedComments}</ul>
                                    </div>`;
                            } else {
                                const pTag = document.createElement("p");
                                pTag.innerHTML = result;
                                resultDiv.innerHTML = `
                                    <div class="result">
                                        <strong><i class="fas fa-magic"></i> Enhanced Content</strong>
                                        ${pTag.innerHTML}
                                    </div>`;
                            }
                        } catch (error) {
                            console.error("Error:", error);
                            resultDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
                            return;
                        }
                    }
                );
            } catch (error) {
                console.error("Error:", error);
                resultDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
            }
        });
    });

function removeJsonCodeBlocks(text) {
    return text.replace(/```json|```/g, "");
}

async function getGeminiEnhancedContent(text, type, apiKey) {
    const maxLength = 20000;
    const truncatedText =
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

    let prompt;

    switch (type) {
        case "comment-generation":
            prompt = `${awesomeCommentPrompt}:\n\n${truncatedText}`;
            break;
        default:
            prompt = `${postEnhancementPrompt}:\n\n${truncatedText}`;
            break;
    }

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                }),
            }
        );

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error?.message || "API request failed");
        }

        const data = await res.json();
        return (
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No summary available."
        );
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate content. Please try again later.");
    }
}

// Copy button functionality
document.getElementById("copy-button").addEventListener("click", () => {
    const resultDiv = document.getElementById("result-box");
    const resultContent = resultDiv.querySelector(".result");

    if (!resultContent) {
        // Show a tooltip or message that there's nothing to copy
        return;
    }

    // Create a temporary element to hold the text
    const tempElement = document.createElement("div");
    tempElement.innerHTML = resultContent.innerHTML;

    // Get all text content
    const textToCopy = tempElement.textContent.trim();

    // Copy to clipboard
    navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
            // Show success feedback
            const copyButton = document.getElementById("copy-button");
            const originalText = copyButton.innerHTML;

            copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';

            setTimeout(() => {
                copyButton.innerHTML = originalText;
            }, 2000);
        })
        .catch((err) => {
            console.error("Failed to copy: ", err);
        });
});

// Theme toggle functionality
document.querySelector(".theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const themeIcon = document.getElementById("theme-icon");

    if (document.body.classList.contains("dark-theme")) {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
        localStorage.setItem("theme", "dark");
    } else {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
        localStorage.setItem("theme", "light");
    }
});

// Settings link
document.querySelector(".settings-link").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

// Load saved theme
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    const themeIcon = document.getElementById("theme-icon");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
    }
});

const awesomeCommentPrompt = `
You are a professional engagement strategist who crafts thoughtful, value-adding comments tailored for professional and thought-leadership platforms (e.g., LinkedIn, X/Twitter, Medium, Substack, etc.).

When provided with a post or article, you will:

1. Analyze the content for:
   - Language of the post (and respond in the same language)
   - Topic and key themes
   - Tone and sentiment
   - Audience type and platform context

2. Generate comments that:
   - Are authentic and personable — never generic or robotic
   - Add real insight or thoughtful reflection
   - Remain concise and conversational (ideal length: 60–150 characters)
   - Match the platform’s and post’s tone while maintaining professionalism
   - Encourage replies and conversation from the original author or other readers

3. Your comments should often:
   - Acknowledge specific points made in the post
   - Ask thought-provoking or experience-based questions
   - Share brief, relevant experiences or reflections
   - Use 1–2 tasteful emojis (only if culturally and contextually appropriate)
   - Avoid empty praise, clichés, hashtags, or tagging others unnecessarily

4. Response Output:
   Return your response as a JSON object in the following format:

   
   {
     "main_comment": "string",
     "recommended_comments": ["string", "string", "string", ...],
   }

    - "main_comment": Your top recommended comment.
    - "recommended_comments": An array of 2-3 alternative comments that are also engaging and relevant (e.g., supportive, reflective, inquisitive, experience-based).
    - Ensure the JSON is well-structured and easy to read.
    - Use double quotes for keys and string values.

    Example: Output 1
    {
        "main_comment": "Quiet leadership isn’t about volume, it’s about consistency and impact — this really resonates. 👏",
        "recommended_comments": [
            "Love this — some of the strongest leaders I’ve known led without ever raising their voice.",
            "How do you think organizations can better recognize quiet leaders in a culture that often rewards charisma?",
            "I've often found the best guidance comes from those who listen first — thanks for highlighting this.",
            "Reminds me of a former mentor whose calm presence always spoke louder than any speech.",
            "Refreshing take. Leadership doesn't need to be loud to be powerful."
        ],
    }

    **Example: Output 2 (French Post: “Le leadership silencieux est souvent le plus puissant.”)**

    {
      "main_comment": "Tellement vrai — l’impact ne vient pas toujours du bruit, mais de la constance. 👌",
      "recommended_comments": [
            "Un mentor calme que j’ai eu m’a beaucoup influencé — merci de mettre ça en lumière.",
            "Pensez-vous que les entreprises valorisent suffisamment ce type de leadership discret ?",
            "Une belle réflexion — les leaders silencieux font souvent la plus grande différence.",
            "Le calme inspire la confiance, bien plus que l’autorité imposée.",
            "J’ai vu ça souvent dans mon équipe : les plus réservés mènent souvent par l’exemple."
        ],
 
    }

    Respond strictly in the same language as the original post, and adapt cultural tone accordingly. If the post includes multiple languages, respond in the dominant one unless otherwise indicated.

`;

const postEnhancementPrompt = `
You are an expert professional content enhancer who transforms rough hooks, drafts, or topic ideas into polished, high-performing posts tailored for platforms like LinkedIn, Twitter/X, Medium, or newsletters. Your goal is to maximize clarity, engagement, and thought leadership — while preserving the user’s voice and intent.

---

<core_principles>
  <principle>Preserve the user's original hook and voice while enhancing clarity and impact</principle>
  <principle>Make complex or niche topics accessible and relatable to a broad audience</principle>
  <principle>Ensure authenticity that aligns with the user’s personal or professional brand</principle>
  <principle>Optimize flow, formatting, and tone for platform algorithms and real human readers</principle>
  <principle>Deliver content that creates value, builds trust, and encourages conversation</principle>
</core_principles>

---

<analysis_process>
  <step>Analyze the user’s text to identify its core idea, tone, and intended audience</step>
  <step>Detect the primary language of the text and respond in the same language</step>
  <step>Determine the most fitting content style (Educational, Storytelling, Motivational, Authority, or Trend Commentary)</step>
  <step>Extract unique voice markers — personal insights, terminology, phrasing — and retain them in the final post</step>
  <step>Optionally integrate related insights, frameworks, or trending angles to boost relevance</step>
</analysis_process>

---

<post_structure>
  <element name="Hook Amplification">Open with a bold, curiosity-sparking line that grabs attention while staying aligned with the user's tone</element>
  <element name="Value-Driven Body">Develop the post with clear, engaging progression using short paragraphs, line breaks, and bullet points when needed</element>
  <element name="Narrative or Insight">Include a micro-story, analogy, or insight that deepens relatability and understanding</element>
  <element name="Engagement Close">End with an open-ended question or CTA that invites responses and encourages interaction</element>
  <element name="Visual Cues">Sprinkle in 3–5 well-placed emojis (if platform-appropriate) to improve readability and emotion</element>
</post_structure>

---

<style_adaptations>
  <style name="Educational">Explain complex concepts clearly using analogies and real-world relevance. Tone: clear, helpful, slightly inspiring.</style>
  <style name="Storytelling">Build emotional connection using a short narrative (problem > challenge > insight). Tone: vulnerable, authentic.</style>
  <style name="Motivational">Use energetic and action-oriented language. Blend inspiration with practical encouragement. Tone: bold, empowering.</style>
  <style name="Authority">Highlight unique perspectives, data, or frameworks. Establish professional credibility. Tone: confident, insightful.</style>
  <style name="Trend Commentary">React to current industry events with fresh, forward-thinking insights. Tone: timely, slightly provocative.</style>
</style_adaptations>

---

<response_format>
  <format>Natural text (not JSON)</format>
  <requirements>
    - Return the **enhanced post** only, fully rewritten and ready to publish
    - Do not include notes, explanations, or bullet lists outside the post itself
    - Format content using short paragraphs, line breaks, and emojis (if appropriate)
    - Write in the **same language** as the input
  </requirements>
  <example>
    🪝 It’s not always the loudest leaders who make the biggest impact.

    I once worked with someone who rarely spoke in meetings — but when they did, everyone listened. Their calm, consistent presence made others feel seen, heard, and valued.

    We need to stop confusing visibility with value.

    💬 What’s one trait you think makes a quiet leader powerful?
  </example>
</response_format>

---

<content_guidelines>
  <guideline>Use simple, conversational language — even for technical topics</guideline>
  <guideline>Avoid jargon, buzzwords, and corporate speak</guideline>
  <guideline>Balance attention-grabbing hooks with trustworthy, meaningful substance</guideline>
  <guideline>Never rely on clickbait or manipulative tactics</guideline>
  <guideline>All claims must be reasonable and credible</guideline>
  <guideline>Prioritize both short-term engagement and long-term brand positioning</guideline>
</content_guidelines>

---

<instructions>
When given a short hook or topic, analyze it, determine the best stylistic enhancement, and return a single fully rewritten post in natural language that is platform-ready, emotionally resonant, and strategically formatted. You must preserve the user’s language and tone while enhancing structure, clarity, and engagement. The final output must **only** be the enhanced post content.
</instructions>

`;

# Plan: Enrich Indexable Static Content

## Goal
Improve Search Engine Optimization (SEO) by providing crawlers with comprehensive, keyword-rich text content that they can parse, as they cannot execute or read the AI chatbot's dynamic responses.

## Steps
1. **Identify Keyword Targets**:
   - Determine the primary keywords you want to rank for (e.g., "Product Designer", "UX/UI", "AI integration", "Paris", "[Your Name]").

2. **Expand the `Hero` Component**:
   - Add a subtitle or an extra paragraph with descriptive, human-readable text that includes your core competencies and role.

3. **Enhance the `ExperienceGrid` Component**:
   - Ensure the descriptions of the Featured Role and passions contain rich terminology relevant to your profession.
   - Example: Instead of just "Business Analyst", expand slightly to "Business Analyst focusing on Digital Transformation and AI-driven Product Design."

4. **Add an 'About Me' / 'Summary' Section (Optional but Recommended)**:
   - Create a new static section below the fold that succinctly describes your professional background, skills, and goals in plain HTML text.
   - This ensures that even if users bypass the chat, crawlers (and users who prefer reading) get the full picture.

5. **Testing**:
   - Run a Lighthouse SEO audit and check the total word count of indexable text block elements (`<p>`, `<h1>`, `<h2>`).

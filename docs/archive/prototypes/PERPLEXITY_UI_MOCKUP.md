# Perplexity.ai UI Mockup - Design Document

## Overview
Transform the current chat interface to match Perplexity.ai's minimalist, centered design while maintaining all existing functionality.

## Design Principles
1. **Minimalism** - Clean, spacious layout with focus on the input area
2. **Centralization** - Content centered on screen, especially on initial state
3. **Dark Theme** - Modern dark aesthetic throughout
4. **Responsive** - Works seamlessly on all device sizes
5. **Progressive Disclosure** - Shows content as user engages

## Layout Structure

### Current State (Empty/Initial)
```
┌─────────────────────────────────────────────────────────┐
│                      Header                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                                                           │
│                    [CV Interactif Logo]                  │
│                                                           │
│          ┌──────────────────────────────┐                │
│          │  Ask me anything about Kim   │                │
│          │  [icons for actions]         │                │
│          └──────────────────────────────┘                │
│                                                           │
│      [Tab 1]  [Tab 2]  [Tab 3]  [Tab 4]                 │
│                                                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Chat State (With Messages)
```
┌─────────────────────────────────────────────────────────┐
│                      Header                              │
├─────────────────────────────────────────────────────────┤
│  < Back                                                  │
│                                                           │
│  [Chat messages scrolled up]                             │
│                                                           │
│                                                           │
│          ┌──────────────────────────────┐                │
│          │  Follow-up question input    │                │
│          │  [icons for actions]         │                │
│          └──────────────────────────────┘                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Main Chat Page Layout
- **Container**: Full viewport height with flex column
- **Logo Area**: Centered, visible only on initial state
- **Input Box**: Centered, always visible (moves to bottom on scroll)
- **Messages Area**: Scrollable above/below input
- **Tabs/Actions**: Below input on initial state

### 2. Input Box Styling
- **Style**: Modern search box with rounded corners
- **Width**: 90% max-width: 600px (responsive)
- **Placeholder**: Subtle, helpful text
- **Icons**: Action buttons (send, attach, voice, etc.)
- **Background**: Darker than main background
- **Border**: Subtle border with hover effect

### 3. Action Tabs
- **Position**: Below input on initial state
- **Type**: Horizontal scrollable tabs/buttons
- **Examples**:
  - "Experience" / "Compétences"
  - "Projects" / "Projets"
  - "Tech Stack"
  - "Contact"
- **Behavior**: Click fills input or triggers action

### 4. Messages Display
- **Initial State**: Hidden
- **During Chat**: Scrollable container
- **Layout**: Similar to current (user right, assistant left)
- **Animations**: Slide-in effects maintained

### 5. Header
- **Minimal**: Just toggles and possibly "New Chat" button
- **Position**: Sticky at top
- **Content**: Logo/title, language toggle, theme toggle

## Color Scheme
- **Background**: `#000000` or `#0a0a0a` (very dark)
- **Input Background**: `#1a1a1a` or `#252525`
- **Text**: `#ffffff` or `#f0f0f0`
- **Accent**: Keep existing blue/purple
- **Borders**: Subtle gray `#333333` to `#444444`

## Responsive Behavior

### Mobile (< 640px)
- Full width minus padding
- Input box scales to fit
- Logo smaller or hidden
- Tabs become scrollable horizontal list

### Tablet (640px - 1024px)
- Max-width 80% of screen
- Centered layout
- Comfortable spacing

### Desktop (> 1024px)
- Max-width 600-700px input
- Centered on screen
- Full-featured layout

## Typography
- **Title**: Large, centered (48px+)
- **Input Placeholder**: Subtle, 16px
- **Messages**: Same as current (15-16px)
- **Tabs**: Medium weight, 14-16px

## Transitions & Animations
- **Input Focus**: Subtle border color change, slight scale
- **Tab Selection**: Highlight with underline or background
- **Message Entry**: Slide animation maintained
- **Layout Shift**: Smooth transitions when layout changes

## Implementation Phase

### Phase 1: Layout Structure
- [ ] Create new centered chat layout component
- [ ] Implement initial state with centered input
- [ ] Add logo/branding area
- [ ] Create action tabs component

### Phase 2: Styling
- [ ] Apply dark theme colors
- [ ] Style input box to match Perplexity
- [ ] Add proper spacing and padding
- [ ] Implement responsive breakpoints

### Phase 3: Interactions
- [ ] Implement input focus state
- [ ] Add tab click handlers
- [ ] Smooth transitions between initial/chat state
- [ ] Mobile touch optimizations

### Phase 4: Integration
- [ ] Merge with existing chat functionality
- [ ] Maintain RAG integration
- [ ] Keep language/theme toggles
- [ ] Test all features

## Current vs New
| Aspect | Current | New (Perplexity) |
|--------|---------|------------------|
| Layout | 3-column (sidebar + chat) | Centered single column |
| Initial State | Shows full sidebar | Centered input + logo |
| Input Position | Always visible, part of chat box | Centered, prominent |
| Branding | Minimal | Large, centered |
| Navigation | Sidebar + header | Minimal header + tabs |
| Focus | Multi-section | Input-focused |

## Key Differences to Maintain
- Keep RAG functionality
- Maintain language switching
- Keep dark mode toggle
- Preserve chat history display
- Keep all existing features

## Success Metrics
- ✓ Centered, minimalist appearance matches Perplexity
- ✓ Input box is the primary focal point
- ✓ All functionality preserved and working
- ✓ Mobile responsive and usable
- ✓ Smooth transitions between states
- ✓ Professional, modern aesthetic

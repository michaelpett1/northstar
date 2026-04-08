# Northstar Roadmap Scan

This file defines the scheduled scan that Claude Cowork runs to discover potential roadmap items from JIRA, Confluence, and Slack.

## Schedule
- **Frequency**: Weekdays at 9:00 AM local time
- **Task name**: `northstar-roadmap-scan`

## Scan Steps

### 1. Load Current State
- Read the existing timeline items from the Northstar app (projectsStore persisted data)
- Read current suggestions from the suggestionsStore to avoid re-suggesting dismissed items
- Build a list of existing item titles and descriptions for deduplication

### 2. Scan JIRA
Use `searchJiraIssuesUsingJql` with these queries:
```
created >= -1d AND project IN (GDCU) ORDER BY created DESC
status changed DURING (startOfDay(-1), now()) AND project IN (GDCU)
```

For each issue found:
- Extract: key, summary, description, status, assignee, priority, URL
- Map JIRA priority to Northstar priority (Highest→p0, High→p1, Medium→p2, Low/Lowest→p3)
- Set suggestedType: Epic→project, Story/Task→task, Bug→task

### 3. Scan Confluence
Use `searchConfluenceUsingCql` with:
```
type=page AND lastmodified >= now('-1d') AND space IN (GDCU, PROD)
```

For each page found:
- Extract: title, excerpt (first 200 chars), author, space key, URL
- Only suggest pages that contain keywords: roadmap, feature, initiative, proposal, RFC, spec

### 4. Scan Slack
Use `slack_search_public_and_private` with queries:
```
roadmap OR "feature request" OR "new initiative" OR "should we build" OR proposal
```
Filter to messages from the last 24 hours.

For each message found:
- Extract: text snippet (first 200 chars), author, channel name, thread URL, timestamp
- Only suggest messages with substantive content (>20 words)

### 5. Deduplication Analysis
For each candidate, compare against existing roadmap items:

**Title similarity check:**
- Normalize both titles: lowercase, strip punctuation, remove common words (the, a, an, for, to, etc.)
- Calculate word overlap percentage
- If overlap > 80%: `duplicateConfidence: 90`, set `duplicateOfId`
- If overlap 50-80%: `duplicateConfidence: 60`, flag as possible duplicate
- If overlap < 50%: treat as new

**Skip rules (do NOT create a suggestion):**
- Item already exists in suggestions (by source URL/key)
- duplicateConfidence > 90
- JIRA issue is of type "Sub-task" or "Bug" with priority Low/Lowest

### 6. Score Relevance
Rate each candidate 0-100 based on:
- **+30**: Contains keywords related to product features, user experience, growth
- **+20**: Created by a known team member (cross-reference TEAM_MEMBERS)
- **+20**: High priority in source system
- **+15**: Multiple people discussed it (Slack thread with replies)
- **+15**: Recently created (within last 24h vs older)

### 7. Write Suggestions
For each qualifying candidate, create a `RoadmapSuggestion` object:
```typescript
{
  id: `sug-${source}-${timestamp}-${random}`,
  title: extracted title,
  description: extracted description,
  source: { type, ...sourceSpecificFields },
  suggestedPriority: mapped priority,
  suggestedType: mapped type,
  suggestedGroupId: '', // let user decide
  relevanceScore: calculated score,
  duplicateOfId: matched ID or null,
  duplicateConfidence: calculated confidence,
  status: 'pending',
  deferredUntil: null,
  reviewedAt: null,
  scannedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  tags: extracted tags,
}
```

Add all new suggestions to the suggestionsStore using `addSuggestions()`.

### 8. Report Summary
After scanning, output a summary:
- Total items scanned across all sources
- New suggestions created
- Duplicates detected and skipped
- Highest relevance items found

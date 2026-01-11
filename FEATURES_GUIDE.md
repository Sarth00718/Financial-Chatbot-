# FinChatBot - Features Guide

## 🎯 Share & Export Features

### Share Conversation 📤

**Location**: Top right header (Share icon)

**What it does:**
- Shares your current conversation with others
- On mobile: Uses native share menu (WhatsApp, Email, etc.)
- On desktop: Copies conversation to clipboard

**How to use:**
1. Have an active conversation with messages
2. Click the Share icon (📤) in the header
3. On mobile: Choose app to share with
4. On desktop: Conversation copied to clipboard - paste anywhere!

**What gets shared:**
```
You: What is this document about?

AI: This document appears to be a financial statement...

You: What is the total revenue?

AI: The total revenue is $1.2 million...
```

---

### Export Conversation 💾

**Location**: Top right header (Download icon)

**What it does:**
- Downloads your conversation as a Markdown file (.md)
- Includes timestamps and formatting
- Can be opened in any text editor

**How to use:**
1. Have an active conversation with messages
2. Click the Download icon (💾) in the header
3. File automatically downloads to your Downloads folder
4. Open with any text editor or Markdown viewer

**File format:**
```markdown
# Conversation Title

Exported from FinChatBot
Date: January 11, 2026, 3:45 PM

---

[2026-01-11 3:45 PM] You:
What is this document about?

---

[2026-01-11 3:45 PM] AI Assistant:
This document appears to be a financial statement...

---
```

**File naming:**
- Format: `Conversation_Title_timestamp.md`
- Example: `Financial_Analysis_1736598345.md`

---

## 🎨 All Features Overview

### 1. **Upload Documents** 📄
- **Icon**: Upload (↑)
- **Supports**: PDF, Excel (.xlsx, .xls), CSV
- **Max size**: 50MB per file
- **Max files**: 10 at once
- **Processing**: Automatic OCR + AI analysis

### 2. **View Documents** 📋
- **Icon**: File icon
- **Shows**: All uploaded documents in conversation
- **Actions**: View, download, delete documents
- **Status**: Processing, completed, failed

### 3. **Analytics** 📊
- **Icon**: Bar chart
- **Shows**: Usage statistics, conversation metrics
- **Data**: Document count, message count, AI usage
- **Visible**: Tablet and desktop only

### 4. **Share Conversation** 📤
- **Icon**: Share icon
- **Action**: Share or copy conversation
- **Platforms**: Native share on mobile, clipboard on desktop
- **Visible**: Desktop only

### 5. **Export Conversation** 💾
- **Icon**: Download icon
- **Action**: Download as Markdown file
- **Format**: .md file with timestamps
- **Visible**: Desktop only

### 6. **Voice Input** 🎤
- **Icon**: Microphone
- **Action**: Speech-to-text input
- **Browsers**: Chrome, Edge, Safari
- **Languages**: English (can be extended)

### 7. **New Conversation** ➕
- **Location**: Sidebar
- **Action**: Start fresh conversation
- **Auto-save**: All conversations saved automatically

### 8. **Search Conversations** 🔍
- **Location**: Sidebar
- **Action**: Filter conversations by title
- **Real-time**: Updates as you type

---

## 💡 Tips & Tricks

### Sharing Tips
1. **Mobile sharing**: Share directly to WhatsApp, Email, Slack, etc.
2. **Desktop sharing**: Paste into Google Docs, Notion, or any app
3. **Privacy**: Only share conversations you're comfortable sharing

### Export Tips
1. **Markdown files**: Can be opened in VS Code, Notion, Obsidian
2. **Formatting**: Preserved with proper headers and sections
3. **Timestamps**: Useful for tracking conversation flow
4. **Backup**: Export important conversations for safekeeping

### Voice Input Tips
1. **Clear speech**: Speak clearly for better accuracy
2. **Punctuation**: Say "period", "comma", "question mark"
3. **Editing**: You can edit the transcribed text before sending
4. **Stop recording**: Click microphone again to stop

### Document Upload Tips
1. **Multiple files**: Upload multiple documents at once
2. **Processing time**: Larger files take longer (10-30 seconds)
3. **OCR**: Images in PDFs are automatically extracted
4. **Context**: AI uses all uploaded documents for answers

---

## 🔧 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send message | Enter |
| New line | Shift + Enter |
| Focus input | / (forward slash) |
| Open sidebar | Ctrl/Cmd + B |

---

## 📱 Mobile Features

### Mobile-Specific
- **Swipe sidebar**: Swipe from left to open sidebar
- **Touch gestures**: Tap outside sidebar to close
- **Native share**: Use device's share menu
- **Voice input**: Tap microphone for speech-to-text
- **Responsive**: All features adapt to screen size

### Mobile Optimizations
- **Large buttons**: Easy to tap (44px minimum)
- **Readable text**: Optimized font sizes
- **Fast loading**: Optimized for mobile networks
- **Offline-ready**: Works with poor connection

---

## 🎯 Feature Availability

| Feature | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Upload Documents | ✅ | ✅ | ✅ |
| View Documents | ✅ | ✅ | ✅ |
| Voice Input | ✅ | ✅ | ✅ |
| New Conversation | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| Share | ✅* | ✅* | ✅ |
| Export | ❌ | ❌ | ✅ |

*Share uses native menu on mobile, clipboard on desktop

---

## 🐛 Troubleshooting

### Share not working?
- **Check**: Browser supports clipboard API
- **Try**: Use Chrome, Edge, or Safari
- **Alternative**: Manually copy conversation text

### Export not downloading?
- **Check**: Pop-up blocker settings
- **Check**: Download folder permissions
- **Try**: Different browser

### Voice input not working?
- **Check**: Microphone permissions
- **Check**: Browser supports speech recognition
- **Try**: Chrome, Edge, or Safari
- **Check**: Microphone is not muted

### Documents not uploading?
- **Check**: File size < 50MB
- **Check**: File type (PDF, Excel, CSV)
- **Check**: Internet connection
- **Try**: Upload one file at a time

---

## 🔒 Privacy & Security

### What gets shared?
- **Share**: Only the conversation text
- **Export**: Conversation text + timestamps
- **Not shared**: Your account info, documents, API keys

### Data storage
- **Conversations**: Stored in your MongoDB database
- **Documents**: Stored locally on server
- **Vectors**: Stored locally (FAISS)
- **No cloud**: All data stays on your infrastructure

### Security features
- **Authentication**: JWT tokens
- **Encryption**: HTTPS in production
- **Privacy**: No data sent to third parties
- **Control**: You own all your data

---

## 📞 Support

Need help with features?
1. Check this guide
2. Review tooltips (hover over buttons)
3. Check browser console for errors
4. Verify all services are running

---

**Enjoy your enhanced FinChatBot! 🚀**

**Version**: 2.0.0  
**Last Updated**: January 11, 2026

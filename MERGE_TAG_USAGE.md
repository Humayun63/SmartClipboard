# Merge Tag Feature - Usage Guide

## Overview
The Merge Tag feature allows you to create shortcuts for frequently used text snippets that can be quickly replaced anywhere on your Mac using a global keyboard shortcut.

## How to Create Merge Tags

1. **Copy some text** to your clipboard (this will appear in Smart Clipboard's history)
2. **Open Smart Clipboard** using `⌘ + ⇧ + V`
3. **Pin the item** by clicking the pin button (📌) next to any history item
4. **Fill out the pin form**:
   - **Title**: A human-readable name for your snippet
   - **Merge Tag Slug**: A unique identifier (lowercase letters, numbers, and underscores only)
     - Examples: `app_name`, `company_email`, `my_address`, `phone_number`
   - **Description**: Optional description of the content

## How to Use Merge Tags

1. **Type your merge tag slug** in any application (e.g., type `app_name` in a document)
2. **Select the text** you just typed
3. **Press `⌃ + ⌥ + M`** (Control + Option + M)
4. **The selected text will be replaced** with your saved content

## Example Workflow

### Setting up a merge tag:
1. Copy "Smart Clipboard Manager" to clipboard
2. Open Smart Clipboard and pin the item
3. Set title: "App Name"
4. Set merge tag slug: `app_name`
5. Save the pin

### Using the merge tag:
1. In any text editor, type: `app_name`
2. Select the text `app_name`
3. Press `⌃ + ⌥ + M`
4. The text changes to: "Smart Clipboard Manager"

## Features

- **Unique slugs**: Each merge tag slug must be unique
- **Validation**: Only lowercase letters, numbers, and underscores allowed
- **Visual indicators**: Pinned items with merge tags show a badge with the slug
- **Persistent storage**: Merge tags are saved and persist between app restarts
- **Error handling**: Clear error messages for duplicate slugs or invalid characters

## Keyboard Shortcuts

- `⌘ + ⇧ + V` - Show Smart Clipboard history
- `⌃ + ⌥ + M` - Replace selected merge tag with saved content
- `⌘ + ⌥ + V` - Show paste menu
- `⌘ + ⌥ + 1-9` - Quick paste from clipboard history
- `⌘ + ⇧ + 1-9` - Quick paste from pinned items

## Tips

1. **Use descriptive slugs**: Choose slugs that are easy to remember and type
2. **Keep it short**: Shorter slugs are faster to type
3. **Be consistent**: Use a naming convention (e.g., `my_email`, `my_phone`, `my_address`)
4. **Test your slugs**: Make sure they don't conflict with common words you type

## Troubleshooting

**Q: The replacement isn't working**
- Make sure you've selected the exact merge tag slug
- Verify the merge tag exists by checking your pinned items
- Try the shortcut again after a short delay

**Q: I get an "already exists" error**
- Each merge tag slug must be unique
- Check your existing pinned items for duplicate slugs
- Choose a different slug name

**Q: Invalid characters error**
- Only use lowercase letters, numbers, and underscores
- No spaces, hyphens, or special characters allowed

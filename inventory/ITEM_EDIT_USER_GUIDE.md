# Item Edit Feature - User Guide

## 🚀 Getting Started

### Step 1: Access the Items Inventory
```
1. Open Admin Dashboard: http://localhost:5000/inventory/dashboard
2. Login with your admin credentials
3. Scroll to "📊 Items Inventory" section
```

### Step 2: Click Edit Button
```
Item Table:
┌─────────────────┬──────────────────┬───────────────┬─────────────┐
│ Item Name       │ Category / Type  │ Brand/Model   │ Actions     │
├─────────────────┼──────────────────┼───────────────┼─────────────┤
│ Dell Laptop     │ Electronics /    │ Dell XPS 13   │ [Edit][Del] │
│                 │ Laptop           │               │             │
└─────────────────┴──────────────────┴───────────────┴─────────────┘
                                                      ↓ Click Edit
```

### Step 3: Edit Modal Opens
```
┌─────────────────────────────────────────────────┐
│ Edit Item                            [✕ Close]  │
├─────────────────────────────────────────────────┤
│                                                  │
│ Item Name *                                      │
│ [__________________________________]           │
│                                                  │
│ Description                                      │
│ [__________________________________]           │
│ [__________________________________]           │
│                                                  │
│ 📦 Category Details                             │
│ ┌───────────────────────────────────────────┐   │
│ │ Main Category *                           │   │
│ │ [▼ Select Category      ]                 │   │
│ │ • Electronics                             │   │
│ │ • Tools                                   │   │
│ │ • Furniture                               │   │
│ │ • Office Supplies                         │   │
│ │ • Laboratory                              │   │
│ │ • Sports Equipment                        │   │
│ │ • Other                                   │   │
│ │                                           │   │
│ │ Type *                                    │   │
│ │ [▼ Select Type          ]                 │   │
│ │ (Auto-populates when category selected)   │   │
│ │                                           │   │
│ │ Brand/Model                               │   │
│ │ [__________________________] (optional)    │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ Quantity Available *    Total Quantity *         │
│ [___________]          [___________]            │
│                                                  │
│ Condition *            Status *                 │
│ [▼ Good    ]           [▼ Available ]           │
│                                                  │
│ Serial Number          Location                 │
│ [___________]          [___________]            │
│                                                  │
│ Purchase Price         Purchase Date            │
│ [___________]          [___________]            │
│                                                  │
│                    [Cancel] [Save Changes]      │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 📝 Form Fields Explained

### Basic Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Item Name | Text | Yes | Name of the item |
| Description | Textarea | No | Additional details |

### Category Details
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Main Category | Dropdown | Yes | Electronics, Tools, Furniture, etc. |
| Type | Dropdown | Yes | Specific type (auto-populated) |
| Brand/Model | Text | No | e.g., "Dell XPS 13", "HP LaserJet Pro" |

### Inventory Management
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Quantity Available | Number | Yes | Items currently available |
| Total Quantity | Number | Yes | Total items in inventory |
| Condition | Dropdown | Yes | Good, Fair, or Poor |
| Status | Dropdown | Yes | Available, Borrowed, Maintenance, Damaged |

### Item Details
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Serial Number | Text | No | Unique identifier |
| Location | Text | No | Storage location |
| Purchase Price | Currency | No | Cost when purchased |
| Purchase Date | Date | No | When item was purchased |

## 🎯 Common Scenarios

### Scenario 1: Edit Electronics Item
```
1. Click Edit on "Dell Laptop" item
2. Main Category: Select "Electronics"
   → Type dropdown updates automatically
3. Type: Select "Laptop"
4. Brand/Model: Enter "Dell XPS 13"
5. Update quantity if needed
6. Click "Save Changes"
```

### Scenario 2: Update Item Condition
```
1. Click Edit on any item
2. Scroll to "Condition" dropdown
3. Change from "Good" to "Fair" if damaged
4. Optionally change Status to "Maintenance"
5. Click "Save Changes"
```

### Scenario 3: Add Stock Information
```
1. Click Edit on item
2. Update "Quantity Available" to current count
3. Update "Total Quantity" if you got more items
4. Add "Purchase Date" and "Purchase Price" if known
5. Click "Save Changes"
```

## ✅ Validation Rules

- **Item Name**: Required, cannot be empty
- **Main Category**: Required, must select from dropdown
- **Type**: Required, must select from dropdown
- **Quantity Available**: Must be number ≥ 0
- **Total Quantity**: Must be number ≥ 1
- **Condition**: Must select Good, Fair, or Poor
- **Status**: Must select from available options

## 💾 Saving & Confirmation

### On Save Success:
```
✓ Item updated successfully!

(After 1.5 seconds, modal closes and list refreshes)
```

### On Save Error:
```
✗ Error: [error message]

(Modal stays open, you can fix and retry)
```

## 🔄 Category Type Reference

### Electronics Types
```
• Laptop              • Monitor
• Desktop Computer    • Printer
• Scanner             • Router
• Speaker             • Projector
```

### Tools Types
```
• Power Drill         • Wrench Set
• Hand Saw            • Screwdriver Set
• Measuring Tape      • Level
• Hammer
```

### Furniture Types
```
• Desk                • Chair
• Bookshelf           • Filing Cabinet
• Table               • Cabinet
```

### Office Supplies Types
```
• Desk Lamp           • Pen Holder
• Stapler             • Document Organizer
• Clipboard
```

### Laboratory Types
```
• Microscope          • Test Tube Set
• Bunsen Burner       • Beaker Set
• Pipette
```

### Sports Equipment Types
```
• Basketball          • Tennis Racket
• Yoga Mat            • Dumbbell Set
• Resistance Bands
```

## 🎨 Modal Features

### Visual Feedback
- **Category Section Highlight**: Blue left border indicates category section
- **Field Focus**: Green border and shadow when field is active
- **Alert Display**: Color-coded messages (green = success, red = error)

### Keyboard Support
- Press **Tab** to move between fields
- Press **Enter** in last field to submit (works in some browsers)
- Press **Escape** to NOT close the modal (use Cancel button instead)

## 🐛 Troubleshooting

### Issue: Type dropdown is empty
**Solution**: Make sure to select a Main Category first. Types are auto-populated.

### Issue: Changes not saved
**Solution**: Check for validation errors (marked with red border). Ensure all required fields are filled.

### Issue: Modal won't open
**Solution**: Try refreshing the page (F5) and logging in again.

### Issue: Can't select multiple items
**Solution**: Edit modal works for one item at a time. For bulk edits, manually edit each item.

## 🚀 Tips & Tricks

1. **Brand/Model Format**: Use manufacturer + model
   - ✅ Good: "Dell XPS 13", "HP LaserJet Pro", "IKEA Billy"
   - ❌ Bad: "laptop", "printer"

2. **Serial Numbers**: Make them unique if possible
   - ✅ Good: "DELL-XPS-2024-001", "HP-LJ-SN123456"
   - ❌ Bad: "123", "Item1"

3. **Location Format**: Be specific
   - ✅ Good: "Building A, Floor 2, Shelf 3", "Lab 101 - Cabinet 3"
   - ❌ Bad: "over there"

4. **Dates**: Use yyyy-mm-dd format
   - ✅ (Date picker handles this automatically)

5. **Prices**: Enter just numbers (no $ or commas)
   - ✅ Good: "1299.99"
   - ❌ Bad: "$1,299.99"

## 📊 Impact on Reports

Items with new category structure will show:
- Main category in category reports
- Type for detailed filtering
- Brand/Model in inventory details

This provides better organization and more detailed reporting options.

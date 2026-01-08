# Phase 6: Interactive Contextual Help System

## Overview

Phase 6 implements a comprehensive contextual help system with modal overlays and interactive tooltips that guide users through each screen. The system provides on-demand help bubbles that explain what each section does, how to use it, and how to update data.

## Goals

### 1. Screen-Level Help Overlays
- ✅ Modal overlay for each major screen (Attendance, Employees, Users, etc.)
- ✅ Highlight important UI sections with animated borders
- ✅ Sequential walkthrough mode for new users
- ✅ Dismissable and can be re-accessed anytime
- ✅ Remember which screens user has seen help for

### 2. Interactive Help Bubbles
- ✅ Hover tooltips on mouse-over for each section
- ✅ Clear, concise explanations (50-100 words max)
- ✅ Three types of info: "What it is", "How to use", "How to update"
- ✅ Positioned intelligently to avoid blocking content
- ✅ Keyboard accessible (Tab navigation)

### 3. Help Management
- ✅ Toggle help mode on/off
- ✅ Help icon/button in navbar
- ✅ "Don't show again" option per screen
- ✅ Reset help progress option
- ✅ Admin ability to edit help content

### 4. User Onboarding
- ✅ First-time user welcome tour
- ✅ Progressive disclosure of features
- ✅ Task completion tracking
- ✅ "Getting Started" checklist

## User Experience Flow

### Help Button in Navbar
```
┌─────────────────────────────────────────┐
│ Attendance | Employees | Dashboard | ? │
└─────────────────────────────────────────┘
                                         ↑
                                    Help button
                                    (shows ? icon)
```

### When Help Mode Activated
```
┌─────────────────────────────────────────┐
│        Attendance Tracking              │
│  ┌───────────────────────────────────┐  │
│  │ ℹ Employee Selector               │  │
│  │ Select which employee's attendance│  │
│  │ you want to view or edit. You can │  │
│  │ search by name or number.         │  │
│  └───────────────────────────────────┘  │
│  [Employee Dropdown] ▼                   │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ ℹ Attendance Grid                 │  │
│  │ Click any date cell to add or edit│  │
│  │ time entries. Multiple entries per│  │
│  │ day show as *totalHours.          │  │
│  └───────────────────────────────────┘  │
│  [Calendar Grid with tooltips]          │
└─────────────────────────────────────────┘
```

### Help Bubble Structure
```
┌────────────────────────────────────┐
│ ℹ Employee Selector                │
├────────────────────────────────────┤
│ What it is:                        │
│ Select the employee whose          │
│ attendance you want to manage.     │
│                                    │
│ How to use:                        │
│ Click the dropdown to see all      │
│ employees you have access to.      │
│                                    │
│ How to update:                     │
│ Go to Employees tab to add new     │
│ employees or modify existing ones. │
└────────────────────────────────────┘
```

## Technical Architecture

### Help Content Structure

```typescript
interface HelpContent {
  id: string;
  screen: string; // 'attendance', 'employees', 'users', etc.
  section: string; // 'employee-selector', 'attendance-grid', etc.
  title: string;
  whatItIs: string;
  howToUse: string;
  howToUpdate: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  highlightSelector?: string; // CSS selector for element to highlight
  order?: number; // For walkthrough sequence
}
```

### Help Content Database/Storage

```typescript
// Option 1: Static JSON file (simpler)
const helpContent: HelpContent[] = [
  {
    id: 'attendance-employee-selector',
    screen: 'attendance',
    section: 'employee-selector',
    title: 'Employee Selector',
    whatItIs: 'Select which employee\'s attendance you want to view or edit.',
    howToUse: 'Click the dropdown to see all employees you have permission to access.',
    howToUpdate: 'Go to the Employees tab to add new employees or modify existing ones.',
    position: 'bottom',
    highlightSelector: '[data-help-id="employee-selector"]',
    order: 1,
  },
  {
    id: 'attendance-grid',
    screen: 'attendance',
    section: 'attendance-grid',
    title: 'Attendance Calendar',
    whatItIs: 'A calendar grid showing all time entries for the selected employee.',
    howToUse: 'Click any date cell to add or edit time entries. Single entries show the time code, multiple entries show *totalHours.',
    howToUpdate: 'Click a cell, then add/edit/delete entries in the dialog that appears.',
    position: 'top',
    highlightSelector: '[data-help-id="attendance-grid"]',
    order: 2,
  },
  // ... more help items
];

// Option 2: Database table (more flexible, allows admin editing)
CREATE TABLE help_content (
  id TEXT PRIMARY KEY,
  screen TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  what_it_is TEXT NOT NULL,
  how_to_use TEXT NOT NULL,
  how_to_update TEXT NOT NULL,
  position TEXT DEFAULT 'auto',
  highlight_selector TEXT,
  display_order INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### User Help Progress Tracking

```typescript
interface UserHelpProgress {
  user_id: number;
  screen: string;
  has_seen: boolean;
  dont_show_again: boolean;
  last_viewed_at: string;
}

// Database table
CREATE TABLE user_help_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  screen TEXT NOT NULL,
  has_seen INTEGER DEFAULT 0,
  dont_show_again INTEGER DEFAULT 0,
  last_viewed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, screen)
);
```

## Components Architecture

### 1. Help Provider Context (`lib/help-context.tsx`)

```typescript
interface HelpContextType {
  isHelpMode: boolean;
  toggleHelpMode: () => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  getHelpForSection: (sectionId: string) => HelpContent | null;
  markScreenAsSeen: (screen: string) => Promise<void>;
  shouldShowWelcome: boolean;
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('');
  // ... context logic
}
```

### 2. Help Button Component (`components/help-button.tsx`)

```typescript
export function HelpButton() {
  const { isHelpMode, toggleHelpMode } = useHelp();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleHelpMode}
      className={isHelpMode ? 'bg-blue-100' : ''}
      title="Toggle Help Mode"
    >
      <HelpCircle className="h-5 w-5" />
      {isHelpMode && <span className="ml-2">Help Mode On</span>}
    </Button>
  );
}
```

### 3. Help Bubble Component (`components/help-bubble.tsx`)

```typescript
interface HelpBubbleProps {
  content: HelpContent;
  targetRef: React.RefObject<HTMLElement>;
  isVisible: boolean;
  onClose?: () => void;
}

export function HelpBubble({ content, targetRef, isVisible, onClose }: HelpBubbleProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Calculate optimal position based on targetRef and viewport
    if (targetRef.current && isVisible) {
      const rect = targetRef.current.getBoundingClientRect();
      // Position bubble to not overlap with target element
      setPosition(calculateOptimalPosition(rect, content.position));
    }
  }, [targetRef, isVisible, content.position]);

  if (!isVisible) return null;

  return (
    <div
      className="absolute z-50 max-w-sm bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          {content.title}
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <p className="font-medium text-gray-700 dark:text-gray-300">What it is:</p>
          <p className="text-gray-600 dark:text-gray-400">{content.whatItIs}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700 dark:text-gray-300">How to use:</p>
          <p className="text-gray-600 dark:text-gray-400">{content.howToUse}</p>
        </div>

        <div>
          <p className="font-medium text-gray-700 dark:text-gray-300">How to update:</p>
          <p className="text-gray-600 dark:text-gray-400">{content.howToUpdate}</p>
        </div>
      </div>
    </div>
  );
}
```

### 4. Help Area Wrapper (`components/help-area.tsx`)

```typescript
interface HelpAreaProps {
  helpId: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpArea({ helpId, children, className }: HelpAreaProps) {
  const { isHelpMode, getHelpForSection } = useHelp();
  const [showBubble, setShowBubble] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const helpContent = getHelpForSection(helpId);

  return (
    <div
      ref={ref}
      data-help-id={helpId}
      className={cn(
        className,
        isHelpMode && 'relative ring-2 ring-blue-500 ring-offset-2 rounded cursor-help'
      )}
      onMouseEnter={() => isHelpMode && setShowBubble(true)}
      onMouseLeave={() => setShowBubble(false)}
    >
      {children}
      {helpContent && (
        <HelpBubble
          content={helpContent}
          targetRef={ref}
          isVisible={showBubble}
        />
      )}
    </div>
  );
}
```

### 5. Welcome Tour Component (`components/welcome-tour.tsx`)

```typescript
export function WelcomeTour() {
  const { shouldShowWelcome, currentScreen } = useHelp();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(shouldShowWelcome);

  const tourSteps = [
    {
      title: 'Welcome to Multi-User Attendance!',
      description: 'Let\'s take a quick tour of the key features.',
      screen: null,
    },
    {
      title: 'Attendance Tracking',
      description: 'Track time entries for all employees with an intuitive calendar interface.',
      screen: 'attendance',
      highlight: 'attendance-grid',
    },
    {
      title: 'Employee Management',
      description: 'Add and manage employee records and their time allocations.',
      screen: 'employees',
      highlight: 'employee-list',
    },
    // ... more steps
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tourSteps[currentStep].title}</DialogTitle>
        </DialogHeader>
        <p>{tourSteps[currentStep].description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Skip Tour
          </Button>
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            {currentStep < tourSteps.length - 1 ? 'Next' : 'Finish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Implementation Per Screen

### Attendance Screen
```typescript
<div className="min-h-screen p-3">
  <div className="max-w-full mx-auto space-y-2">
    <HelpArea helpId="attendance-header">
      <h1 className="text-xl font-bold">Attendance</h1>
    </HelpArea>

    <HelpArea helpId="attendance-employee-selector">
      <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg bg-card">
        <Label htmlFor="employee">Employee</Label>
        <Select>
          {/* ... */}
        </Select>
      </div>
    </HelpArea>

    <HelpArea helpId="attendance-grid">
      <AttendanceGrid
        year={year}
        employeeId={selectedEmployeeId}
        entries={entries}
        timeCodes={timeCodes}
        onEntryChange={handleEntryChange}
      />
    </HelpArea>

    <HelpArea helpId="attendance-balance-cards">
      <BalanceCards entries={entries} allocations={allocations} />
    </HelpArea>
  </div>
</div>
```

## Help Content Examples

### Attendance Screen

| Section | What it is | How to use | How to update |
|---------|-----------|------------|---------------|
| **Employee Selector** | Dropdown to choose which employee's attendance to view | Click the dropdown and select an employee from the list | Go to Employees tab to add new employees |
| **Year Selector** | Choose which year's attendance to display | Click the year dropdown to select a different year | Calendar automatically shows selected year |
| **Attendance Grid** | Calendar showing all time entries for the employee | Click any date cell to add or edit time entries. Single entries show time code (V 8), multiple entries show *totalHours (*8.5) | Click a cell to open the entry dialog where you can add, edit, or delete entries |
| **Balance Cards** | Shows used vs allocated hours for limited time codes | View remaining hours for Vacation, Floating Holidays, etc. | Balances update automatically as you add entries. Allocations can be customized per employee in Employees tab |
| **Time Code Legend** | Reference list of all available time codes | Use this to understand what each time code abbreviation means | Contact your administrator to add or modify time codes |

### Employees Screen

| Section | What it is | How to use | How to update |
|---------|-----------|------------|---------------|
| **Employee List** | Table of all employees you have access to | Browse, search, and select employees to view details | Click "Add Employee" or click edit icon on an employee |
| **Add Employee Button** | Create a new employee record | Click to open a form for entering new employee information | Fill out required fields (name, group) and save |
| **Employee Groups** | Filter employees by their assigned group | Click a group badge to filter the list | Groups are managed by administrators in the Groups settings |
| **Time Allocations** | Custom time-off hours per employee per year | Click the clock icon next to an employee to set custom allocations | Enter custom hours or use defaults, changes take effect immediately |

### Users Screen (Superuser Only)

| Section | What it is | How to use | How to update |
|---------|-----------|------------|---------------|
| **User List** | All system users who can log in | View all user accounts and their permissions | Click "Add User" or edit icon to modify |
| **Superuser Badge** | Indicates users with full system access | Superusers bypass all permission checks and can manage everything | Toggle superuser checkbox when creating/editing users |
| **Group Permissions** | Per-user per-group CRUD access controls | Click shield icon to manage which groups a user can access | Check/uncheck Create, Read, Update, Delete permissions per group |

## API Endpoints

- `GET /api/help/content` - Get all help content for current screen
- `GET /api/help/content/:screen` - Get help content for specific screen
- `POST /api/help/progress` - Mark screen as seen
- `PUT /api/help/progress` - Update "don't show again" preference
- `GET /api/help/progress` - Get user's help progress
- `POST /api/help/reset` - Reset user's help progress (start over)

### Admin Endpoints (Superuser only)
- `PUT /api/help/content/:id` - Update help content text
- `POST /api/help/content` - Add new help content
- `DELETE /api/help/content/:id` - Remove help content

## Configuration

```env
# Help system settings
HELP_ENABLED=true
HELP_SHOW_WELCOME_TOUR=true
HELP_AUTO_SHOW_NEW_SCREENS=false
```

## UI/UX Guidelines

### Visual Design
- **Help bubbles**: White background with blue accent border
- **Highlight color**: Blue ring (ring-blue-500)
- **Icon**: Info circle (ℹ) in blue
- **Animation**: Fade in/out, subtle pulse on highlighted areas
- **Z-index**: Above all content but below modals

### Interaction Patterns
- **Hover delay**: 300ms before showing bubble
- **Auto-hide**: Bubble stays visible while cursor over target or bubble
- **Keyboard**: Tab through help areas when help mode active
- **Mobile**: Tap to toggle help bubble instead of hover

### Content Guidelines
- **Brevity**: Keep each section under 100 words
- **Active voice**: "Click the button" not "The button can be clicked"
- **No jargon**: Use simple, clear language
- **Consistent structure**: Always include all three sections (What/How/Update)

## Implementation Steps

### Phase 6.1: Core Help System (Week 1)
1. Create help content structure and data
2. Implement HelpProvider context
3. Build HelpBubble component
4. Create HelpArea wrapper
5. Add help button to navbar

### Phase 6.2: Screen Integration (Week 2)
1. Wrap Attendance screen sections with HelpArea
2. Wrap Employees screen sections
3. Wrap Users screen sections
4. Wrap Dashboard screen sections
5. Write all help content

### Phase 6.3: Progress Tracking (Week 2)
1. Create user_help_progress table
2. Implement progress tracking API
3. "Don't show again" functionality
4. Reset progress option
5. Per-screen seen tracking

### Phase 6.4: Welcome Tour (Week 3)
1. Build WelcomeTour component
2. Multi-step walkthrough logic
3. Highlight animation system
4. First-time user detection
5. Skip/dismiss handling

### Phase 6.5: Admin Features (Week 3)
1. Help content management UI (optional)
2. Edit help text in-place
3. Preview mode before saving
4. Help content validation

## Testing Strategy

- Content accuracy for all screens
- Bubble positioning on different screen sizes
- Hover/click interactions
- Keyboard navigation through help areas
- Mobile touch interactions
- Help mode toggle persistence
- Progress tracking accuracy

## Success Criteria

- ✅ All major screens have comprehensive help content
- ✅ Help bubbles position correctly without blocking content
- ✅ Help mode can be toggled on/off easily
- ✅ New users see welcome tour on first login
- ✅ Help progress tracked per user
- ✅ Reduces support questions by 50%+
- ✅ 90%+ of users find help content useful (survey)

## Timeline Estimate

- **Week 1**: Core help system and components
- **Week 2**: Screen integration and progress tracking
- **Week 3**: Welcome tour and admin features

**Total**: 3 weeks

## Future Enhancements

- Video tutorials embedded in help bubbles
- Interactive demos that walk through actions
- Search functionality for help content
- Help content in multiple languages
- Analytics on which help sections are viewed most
- Tooltips for form field validation
- AI-powered contextual help suggestions

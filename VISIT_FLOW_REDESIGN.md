# Visit Flow Redesign - Simplified & Logical

## Current Problem
The existing flow requires builder approval BEFORE agent assignment, which doesn't make sense. Agents should be assigned immediately, and builder approval should only be needed for project site visits.

## New Simplified Flow

### Flow A: Regular Property Visit (No Builder)
```
1. Buyer books visit
   └─> Agent auto-assigned
   └─> Status: "confirmed"
   └─> Notifications sent to buyer & agent

2. Visit Day - Agent starts
   └─> Status: "in_progress"
   └─> Real-time location sharing active

3. Visit completes
   └─> Status: "completed"
   └─> Feedback requested
```

### Flow B: Project Site Visit (With Builder)
```
1. Buyer books visit
   └─> Agent auto-assigned
   └─> Status: "pending_approval"
   └─> Notification to builder for approval

2. Builder approves/rejects
   └─> If approved: Status: "confirmed"
   └─> If rejected: Status: "cancelled"
   └─> Notifications sent

3. Visit Day - Agent starts
   └─> Status: "in_progress"
   └─> Real-time location sharing active

4. Visit completes
   └─> Status: "completed"
   └─> Feedback requested
```

## Status Definitions

| Status | Meaning | Who Sees It |
|--------|---------|-------------|
| `pending_approval` | Waiting for builder approval (projects only) | Buyer, Builder, Agent |
| `confirmed` | Visit is confirmed and scheduled | Buyer, Agent |
| `in_progress` | Visit is currently happening | Buyer, Agent |
| `completed` | Visit finished successfully | Buyer, Agent |
| `cancelled` | Visit was cancelled or rejected | Buyer, Agent, Builder |

## Dashboard Views

### Buyer Dashboard
- **Upcoming Visits**: confirmed, pending_approval
- **Past Visits**: completed, cancelled
- **Actions**: 
  - Track live (for in_progress)
  - View details
  - Cancel (for confirmed/pending_approval)

### Agent Dashboard
- **Today's Visits**: confirmed visits for today
- **Upcoming Visits**: all confirmed future visits
- **Past Visits**: completed visits
- **Actions**:
  - Start visit (changes to in_progress)
  - Share location during visit
  - Post story updates
  - Complete visit

### Builder Dashboard (Projects Only)
- **Pending Approvals**: pending_approval visits
- **Approved Visits**: confirmed visits for my projects
- **Actions**:
  - Approve with notes
  - Reject with reason

## Key Changes
1. ✅ Agent assigned immediately at booking
2. ✅ Only projects need builder approval
3. ✅ Clear status progression
4. ✅ Real-time updates between all parties
5. ✅ Simplified dashboard views

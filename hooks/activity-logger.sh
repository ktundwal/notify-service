#!/bin/bash
# hooks/activity-logger.sh
#
# Transparency hook for Claude Code agent teams.
# Logs task lifecycle, agent spawns, messages, and file changes
# to agent-activity.log in a human-readable format.
#
# Attach to PostToolUse + SubagentStart + SubagentStop in .claude/settings.json.
# Requires: jq

LOG="${CLAUDE_PROJECT_DIR:-.}/agent-activity.log"
TS=$(date '+%H:%M:%S')
INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // ""')

case "$EVENT" in

  PostToolUse)
    TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""')
    case "$TOOL" in

      TaskCreate)
        SUBJECT=$(echo "$INPUT" | jq -r '.tool_input.subject // "?"')
        echo "$TS  TASK+    $SUBJECT" >> "$LOG"
        ;;

      TaskUpdate)
        TASK_ID=$(echo "$INPUT" | jq -r '.tool_input.taskId // "?"')
        STATUS=$(echo "$INPUT" | jq -r '.tool_input.status // ""')
        OWNER=$(echo "$INPUT" | jq -r '.tool_input.owner // ""')
        case "$STATUS" in
          completed)
            echo "$TS  TASK✓    #$TASK_ID completed" >> "$LOG"
            ;;
          in_progress)
            if [ -n "$OWNER" ]; then
              echo "$TS  TASK→    #$TASK_ID in_progress → $OWNER" >> "$LOG"
            else
              echo "$TS  TASK→    #$TASK_ID in_progress" >> "$LOG"
            fi
            ;;
          *)
            if [ -n "$OWNER" ]; then
              echo "$TS  ASSIGN   #$TASK_ID → $OWNER" >> "$LOG"
            fi
            ;;
        esac
        ;;

      SendMessage)
        TYPE=$(echo "$INPUT" | jq -r '.tool_input.type // "message"')
        RECIPIENT=$(echo "$INPUT" | jq -r '.tool_input.recipient // "all"')
        SUMMARY=$(echo "$INPUT" | jq -r '.tool_input.summary // ""' | head -c 80)
        if [ "$TYPE" = "broadcast" ]; then
          echo "$TS  MSG*     → all: $SUMMARY" >> "$LOG"
        elif [ "$TYPE" = "shutdown_request" ]; then
          echo "$TS  SHUT→    → $RECIPIENT: shutdown requested" >> "$LOG"
        else
          echo "$TS  MSG      → $RECIPIENT: $SUMMARY" >> "$LOG"
        fi
        ;;

      Edit)
        FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // "?"')
        FILE=$(echo "$FILE" | sed 's|.*/notify-service/||')
        echo "$TS  EDIT     $FILE" >> "$LOG"
        ;;

      Write)
        FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // "?"')
        FILE=$(echo "$FILE" | sed 's|.*/notify-service/||')
        echo "$TS  WRITE    $FILE" >> "$LOG"
        ;;

      Bash)
        DESC=$(echo "$INPUT" | jq -r '.tool_input.description // ""' | head -c 60)
        if [ -n "$DESC" ]; then
          echo "$TS  BASH     $DESC" >> "$LOG"
        fi
        ;;

    esac
    ;;

  SubagentStart)
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')
    AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "?"')
    SHORT_ID=$(echo "$AGENT_ID" | grep -oE '[^-]+$' | head -c 8)
    echo "$TS  SPAWN    $AGENT_TYPE ...$SHORT_ID" >> "$LOG"
    ;;

  SubagentStop)
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')
    AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "?"')
    SHORT_ID=$(echo "$AGENT_ID" | grep -oE '[^-]+$' | head -c 8)
    echo "$TS  STOP     $AGENT_TYPE ...$SHORT_ID" >> "$LOG"
    ;;

esac

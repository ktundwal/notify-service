import { Notification, AdaptiveCard, Priority } from '../types';

const PRIORITY_COLORS: Record<Priority, string> = {
  P0: 'attention',
  P1: 'warning',
  P2: 'accent',
  P3: 'default',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

export function buildAdaptiveCard(notification: Notification): AdaptiveCard {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'TextBlock',
                text: PRIORITY_LABELS[notification.priority],
                color: PRIORITY_COLORS[notification.priority],
                weight: 'bolder',
                size: 'small',
              },
            ],
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: notification.channel,
                size: 'small',
                weight: 'lighter',
              },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        text: notification.title,
        size: 'large',
        weight: 'bolder',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: notification.body,
        wrap: true,
        spacing: 'small',
      },
      {
        type: 'TextBlock',
        text: `Source: ${notification.sourceId}`,
        size: 'small',
        weight: 'lighter',
        spacing: 'medium',
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Details',
        url: `https://notify.example.com/notifications/${notification.id}`,
      },
    ],
  };
}

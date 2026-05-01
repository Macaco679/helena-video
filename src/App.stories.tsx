import type { Meta, StoryObj } from "@storybook/react";
import App from "./App";

const meta = {
  title: "Helena Video/App Shell",
  component: App,
  parameters: {
    layout: "fullscreen"
  },
  decorators: [
    (Story) => {
      window.history.replaceState(null, "", "/studio");
      return <Story />;
    }
  ]
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Studio: Story = {};

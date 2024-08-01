"use client";

import { Checkbox, ListItem } from "@chakra-ui/react";

export default function TodoItem({
  content,
  completed = false,
}: {
  content: string;
  completed?: boolean;
}) {
  return (
    <ListItem borderBottomColor="gray.500" borderBottomWidth="1px" py={4}>
      <Checkbox
        defaultChecked={completed}
        sx={{
          textDecoration: completed ? "line-through" : "initial",
        }}
      >
        {content}
      </Checkbox>
    </ListItem>
  );
}

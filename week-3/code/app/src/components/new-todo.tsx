"use client";

import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { IdlAccounts } from "@coral-xyz/anchor";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IDL } from "../../../target/types/todo_app";

export default function NewTodo({
  profile,
}: {
  profile: IdlAccounts<typeof IDL>["profile"];
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();

  const queryClient = useQueryClient();

  const [content, setContent] = useState("");

  const provider = useAnchorProvider();

  const { isPending, mutateAsync } = useMutation({
    mutationKey: ["create-todo", provider.publicKey, profile.todoCount],
    mutationFn: async (content: string) => {
      try {
        const program = new TodoProgram(provider);

        const tx = await program.createTodo(content, profile.todoCount);
        const signature = await provider.sendAndConfirm(tx);

        return signature;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async (tx) => {
      console.log(tx);

      toast({
        title: "Transaction sent",
        status: "success",
      });

      return queryClient.invalidateQueries({
        queryKey: ["profile", provider.publicKey.toBase58()],
      });
    },
    onError: (error) => {
      console.error(error);
    },
    onSettled: () => {
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    mutateAsync(content);
  };

  return (
    <>
      <Button onClick={onOpen} colorScheme="blue">
        Add todo
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit}>
          <ModalHeader>New todo</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Content</FormLabel>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Describe what this todo is about"
                rows={8}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              colorScheme="blue"
              ml={3}
              isLoading={isPending}
              loadingText="Creating"
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

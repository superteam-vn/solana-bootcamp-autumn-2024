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
  Input,
  useToast,
} from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function NewProfile() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const queryClient = useQueryClient();

  const [name, setName] = useState("");

  const provider = useAnchorProvider();

  const { isPending, mutateAsync } = useMutation({
    mutationKey: ["create-profile", provider.publicKey],
    mutationFn: async (name: string) => {
      const program = new TodoProgram(provider);

      const tx = await program.createProfile(name);

      const signature = await provider.sendAndConfirm(tx);

      return signature;
    },
    onSuccess: (tx) => {
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
    mutateAsync(name);
  };

  return (
    <>
      <Button onClick={onOpen} colorScheme="blue">
        New profile
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit}>
          <ModalHeader>New profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              isLoading={isPending}
              type="submit"
              colorScheme="blue"
              loadingText="Creating"
              ml={3}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

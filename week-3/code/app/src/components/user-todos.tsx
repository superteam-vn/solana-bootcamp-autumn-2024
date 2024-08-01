"use client";

import { WalletMultiButtonDynamic } from "@/components/connect-wallet-button";
import NewProfile from "@/components/new-profile";
import NewTodo from "@/components/new-todo";
import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import { Center, Flex, Spinner, Text } from "@chakra-ui/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import TodoList from "./todo-list";

export default function UserTodos() {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", publicKey?.toBase58()],
    enabled: !!publicKey,
    queryFn: () => new TodoProgram(provider).fetchProfile(),
  });

  if (isLoading) {
    return (
      <Center as={Flex} direction="column" gap={4} py={8}>
        <Spinner size="xl" colorScheme="blue" />
        <Text>Please wait...</Text>
      </Center>
    );
  }

  if (!profile) {
    return <NewProfile />;
  }

  console.log("profile", profile.todoCount);

  return (
    <Flex direction="column" gap={8}>
      <WalletMultiButtonDynamic />
      <Text fontSize="2xl" fontWeight="bold">
        {profile?.name}
      </Text>
      <TodoList profile={profile} />
      <NewTodo profile={profile} />
    </Flex>
  );
}

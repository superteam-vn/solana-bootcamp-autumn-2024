"use client";

import { WalletMultiButtonDynamic } from "@/components/connect-wallet-button";
import { Box, Center, Container } from "@chakra-ui/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ReactNode } from "react";
import UserTodos from "@/components/user-todos";

export default function Home() {
  const { publicKey } = useWallet();

  let content: ReactNode;

  if (!publicKey) {
    content = (
      <Center>
        <WalletMultiButtonDynamic />
      </Center>
    );
  } else {
    content = <UserTodos />;
  }

  return (
    <Box w="full" minH="100vh">
      <Container py={16}>{content}</Container>
    </Box>
  );
}

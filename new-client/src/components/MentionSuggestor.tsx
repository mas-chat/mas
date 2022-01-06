import React, { FunctionComponent, useMemo, useState, useEffect } from 'react';
import { FloatingWrapper, useMentionAtom } from '@remirror/react';
import { MentionExtensionAttributes } from '@remirror/extension-mention';
import { Box } from '@chakra-ui/react';
import UserModel from '../models/User';

interface MentionSuggestorProps {
  users: Map<string, UserModel>;
}

export const MentionSuggestor: FunctionComponent<MentionSuggestorProps> = ({ users }: MentionSuggestorProps) => {
  const usersArray: MentionExtensionAttributes[] = useMemo(
    () =>
      Array.from(users.values()).map(user => ({
        id: user.id,
        label: user.nick.mas
      })),
    [users]
  );

  const [proposedUsers, setProposedUsers] = useState<MentionExtensionAttributes[]>([]);
  const { state, getMenuProps, getItemProps, indexIsHovered, indexIsSelected } = useMentionAtom({
    items: usersArray
  });

  useEffect(() => {
    if (!state) {
      return;
    }

    const searchTerm = state.query.full.toLowerCase();
    const filteredUsers = usersArray
      .filter(user => user.label.toLowerCase().includes(searchTerm))
      .sort()
      .slice(0, 5);

    setProposedUsers(filteredUsers);
  }, [state, usersArray]);

  const enabled = !!state;

  return (
    <FloatingWrapper positioner="cursor" enabled={enabled} placement="bottom-start">
      <Box {...getMenuProps()} className="suggestions">
        {enabled &&
          proposedUsers.map((user, index) => {
            const isHighlighted = indexIsSelected(index);
            const isHovered = indexIsHovered(index);

            return (
              <Box
                key={user.id}
                p={1}
                bgColor={isHovered ? 'blue.300' : isHighlighted ? 'red.300' : 'gray.700'}
                {...getItemProps({
                  item: user,
                  index
                })}
              >
                {user.label}
              </Box>
            );
          })}
      </Box>
    </FloatingWrapper>
  );
};

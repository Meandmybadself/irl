import { prisma } from '../lib/prisma.js';

export const findPersonWithContacts = async (personId: number) => {
  return prisma.person.findUnique({
    where: { id: personId },
    include: {
      contactInformation: {
        include: {
          contactInformation: true
        }
      },
      user: true,
      groupMemberships: {
        include: {
          group: true
        }
      }
    }
  });
};

export const findPersonByDisplayId = async (displayId: string) => {
  return prisma.person.findUnique({
    where: { displayId },
    include: {
      contactInformation: {
        include: {
          contactInformation: true
        }
      },
      user: true,
      groupMemberships: {
        include: {
          group: true
        }
      }
    }
  });
};

export const findGroupWithMembers = async (groupId: number) => {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      people: {
        include: {
          person: {
            include: {
              contactInformation: {
                include: {
                  contactInformation: true
                }
              }
            }
          }
        }
      },
      contactInformation: {
        include: {
          contactInformation: true
        }
      },
      parentGroup: true,
      childGroups: true
    }
  });
};

export const findGroupByDisplayId = async (displayId: string) => {
  return prisma.group.findUnique({
    where: { displayId },
    include: {
      people: {
        include: {
          person: {
            include: {
              contactInformation: {
                include: {
                  contactInformation: true
                }
              }
            }
          }
        }
      },
      contactInformation: {
        include: {
          contactInformation: true
        }
      },
      parentGroup: true,
      childGroups: true
    }
  });
};

export const findUserWithPeople = async (userId: number) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      people: {
        include: {
          contactInformation: {
            include: {
              contactInformation: true
            }
          },
          groupMemberships: {
            include: {
              group: true
            }
          }
        }
      },
      adminSystems: {
        include: {
          system: true
        }
      }
    }
  });
};

export const findSystemWithAdmins = async (systemId: number) => {
  return prisma.system.findUnique({
    where: { id: systemId },
    include: {
      adminUsers: {
        include: {
          user: {
            include: {
              people: true
            }
          }
        }
      },
      contactInformation: {
        include: {
          contactInformation: true
        }
      }
    }
  });
};

export const createPersonWithContact = async (data: {
  firstName: string;
  lastName: string;
  displayId: string;
  pronouns?: string;
  imageURL?: string;
  userId?: number;
  contactInfo?: {
    type: 'EMAIL' | 'PHONE' | 'ADDRESS' | 'URL';
    label: string;
    value: string;
    privacy: 'PRIVATE' | 'PUBLIC';
  };
}) => {
  const personData: any = {
    firstName: data.firstName,
    lastName: data.lastName,
    displayId: data.displayId,
    ...(data.pronouns && { pronouns: data.pronouns }),
    ...(data.imageURL && { imageURL: data.imageURL }),
    ...(data.userId && { userId: data.userId }),
    ...(data.contactInfo && {
      contactInformation: {
        create: {
          contactInformation: {
            create: {
              type: data.contactInfo.type,
              label: data.contactInfo.label,
              value: data.contactInfo.value,
              privacy: data.contactInfo.privacy
            }
          }
        }
      }
    })
  };

  return prisma.person.create({
    data: personData,
    include: {
      contactInformation: {
        include: {
          contactInformation: true
        }
      },
      user: true
    }
  });
};

export const createGroupWithParent = async (data: {
  displayId: string;
  name: string;
  description?: string;
  parentGroupId?: number;
  allowsAnyUserToCreateSubgroup?: boolean;
  publiclyVisible?: boolean;
}) => {
  return prisma.group.create({
    data,
    include: {
      parentGroup: true,
      childGroups: true,
      contactInformation: {
        include: {
          contactInformation: true
        }
      }
    }
  });
};

export const addPersonToGroup = async (
  personId: number,
  groupId: number,
  relation: 'PARENT' | 'TEACHER' | 'COACH' | 'MEMBER' | 'ADMIN',
  isAdmin = false
) => {
  return prisma.personGroup.create({
    data: {
      personId,
      groupId,
      relation,
      isAdmin
    },
    include: {
      person: true,
      group: true
    }
  });
};

export const createClaim = async (personId: number, expirationDays = 30) => {
  const claimCode = Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return prisma.claim.create({
    data: {
      personId,
      claimCode,
      expiresAt
    },
    include: {
      person: true
    }
  });
};

export const claimPerson = async (claimCode: string, newUserId: number) => {
  const claim = await prisma.claim.findUnique({
    where: { claimCode },
    include: { person: true }
  });

  if (!claim || claim.claimed || claim.expiresAt < new Date()) {
    throw new Error('Invalid or expired claim code');
  }

  // Update the claim and transfer the person to the new user
  const [updatedClaim] = await prisma.$transaction([
    prisma.claim.update({
      where: { id: claim.id },
      data: {
        claimed: true,
        claimedAt: new Date()
      }
    }),
    prisma.person.update({
      where: { id: claim.personId },
      data: {
        userId: newUserId
      }
    })
  ]);

  return updatedClaim;
};
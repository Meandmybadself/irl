import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyUser() {
  try {
    // Find the user by email
    const user = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', user.email);
    console.log('Current verification token:', user.verificationToken);

    // Clear the verification token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: null }
    });

    console.log('User verified successfully');
    console.log('Updated user:', updatedUser.email, 'verificationToken:', updatedUser.verificationToken);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();

import React from 'react';
import { UpdatedPage } from './UpdatedPage';

interface UpdatesPageProps {
  navigate: (route: string) => void;
}

export function UpdatesPage({ navigate }: UpdatesPageProps) {
  return <UpdatedPage navigate={navigate} />;
}

export default UpdatesPage;

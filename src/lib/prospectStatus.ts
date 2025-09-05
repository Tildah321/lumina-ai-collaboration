export const mapProspectStatus = (status: string) => {
  switch (status) {
    case 'nouveau':
      return 'Nouveau';
    case 'en contact':
      return 'En contact';
    case 'en discussion':
      return 'En discussion';
    case 'converti':
      return 'Converti';
    default:
      return status;
  }
};

export const mapProspectStatusToNoco = (status: string) => {
  switch (status) {
    case 'Nouveau':
      return 'nouveau';
    case 'En contact':
      return 'en contact';
    case 'En discussion':
      return 'en discussion';
    case 'Converti':
      return 'converti';
    default:
      return status;
  }
};

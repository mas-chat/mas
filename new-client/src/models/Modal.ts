export enum ModalType {
  Info,
  Help
}

export type Modal = {
  type: ModalType;
  title?: string;
  body?: string;
  forced?: boolean;
  action?: {
    executedButton: string;
    cancelButton: string;
    submit: () => void;
  };
};

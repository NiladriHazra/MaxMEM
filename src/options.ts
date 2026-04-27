export interface OptionValueInput {
  args: string[];
  name: string;
}

export const optionValue = ({ args, name }: OptionValueInput) => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  const directIndex = args.findIndex((arg) => arg === `--${name}`);

  if (inline) {
    return inline.slice(prefix.length);
  }

  return directIndex >= 0 ? args.at(directIndex + 1) : undefined;
};

export const hasFlag = ({ args, name }: OptionValueInput) => args.includes(`--${name}`);

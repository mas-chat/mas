import React, { FunctionComponent } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputProps,
  CheckboxProps,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  Checkbox
} from '@chakra-ui/react';
import { Formik, Form, Field, FormikState, FormikHelpers } from 'formik';
import { IoLogoGoogle } from 'react-icons/io5';
import { getConfig } from '../lib/config';

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  passwordAgain: string;
  nick: string;
  tos: boolean;
}

interface InputRenderProps<T> {
  field: T;
  form: FormikState<RegisterValues>;
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterModal: FunctionComponent<RegisterModalProps> = ({ isOpen, onClose }: RegisterModalProps) => {
  const validateName = (value: string) => {
    if (!value) {
      return 'Name is required';
    } else if (value.length < 6) {
      return 'Name is too short';
    }
  };

  const validateEmail = (value: string) => {
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
      return 'Invalid email address';
    }
  };

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'Password is too short';
    }
  };

  const validateNick = (value: string) => {
    if (value.length < 3) {
      return 'Nickname is too short';
    }
  };

  const validateTos = (value: boolean) => {
    if (!value) {
      return 'You must agree to the terms of service';
    }
  };

  const validatePasswordMatch = (password: string, value: string) => {
    if (password !== value) {
      return 'Passwords do not match';
    }
  };

  const googleRedirect = () => {
    window.location.pathname = '/auth/google';
  };

  const handleRegister = async (values: RegisterValues, actions: FormikHelpers<RegisterValues>) => {
    let data;

    try {
      const response = await fetch('/api/v1/register', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values),
        credentials: 'include'
      });

      data = await response.json();
    } catch (e) {
      actions.setErrors({ name: 'Network error. Please try again later.' });
      return;
    }

    if (data.success === true) {
      // Server has set the cookie, just redirect
      window.location.pathname = '/app/';
    } else {
      actions.setErrors(data.errors);
    }
  };

  const extRegister = getConfig().auth.google ? (
    <Box mt={8}>
      <Box>Register with an existing account:</Box>
      <Button mt={4} onClick={googleRedirect} leftIcon={<IoLogoGoogle />}>
        Google Account
      </Button>
    </Box>
  ) : null;

  const form = (
    <Formik
      initialValues={{ name: '', email: '', password: '', passwordAgain: '', nick: '', tos: false }}
      onSubmit={handleRegister}
    >
      {({ isSubmitting, values }) => (
        <Form>
          <Field name="name" validate={validateName}>
            {({ field, form }: InputRenderProps<InputProps>) => (
              <FormControl mt={4} isInvalid={Boolean(form.errors.name) && form.touched.name}>
                <FormLabel htmlFor="name">Your Name</FormLabel>
                <Input {...field} id="name" placeholder="name" />
                <FormErrorMessage>{form.errors.name}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="email" validate={validateEmail}>
            {({ field, form }: InputRenderProps<InputProps>) => (
              <FormControl mt={4} isInvalid={Boolean(form.errors.email) && form.touched.email}>
                <FormLabel htmlFor="email">Email Address</FormLabel>
                <Input {...field} type="email" id="email" placeholder="email" />
                <FormErrorMessage>{form.errors.email}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="password" validate={validatePassword}>
            {({ field, form }: InputRenderProps<InputProps>) => (
              <FormControl mt={4} isInvalid={Boolean(form.errors.password) && form.touched.password}>
                <FormLabel htmlFor="password">Password</FormLabel>
                <Input {...field} type="password" id="password" placeholder="password" />
                <FormErrorMessage>{form.errors.password}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field
            name="passwordAgain"
            validate={(value: string) => validatePasswordMatch(values.password, value)}
            validateOnBlur={true}
            validateOnChange={false}
          >
            {({ field, form }: InputRenderProps<InputProps>) => (
              <FormControl mt={4} isInvalid={Boolean(form.errors.passwordAgain) && form.touched.passwordAgain}>
                <FormLabel htmlFor="passwordAgain">Password (again)</FormLabel>
                <Input {...field} type="password" id="passwordAgain" placeholder="passwordAgain" />
                <FormErrorMessage>{form.errors.passwordAgain}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="nick" validate={validateNick}>
            {({ field, form }: InputRenderProps<InputProps>) => (
              <FormControl mt={4} isInvalid={Boolean(form.errors.nick) && form.touched.nick}>
                <FormLabel htmlFor="nick">Nickname</FormLabel>
                <Input {...field} id="nick" placeholder="nick" />
                <FormErrorMessage>{form.errors.nick}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="tos" validate={validateTos}>
            {({ field, form }: InputRenderProps<CheckboxProps>) => (
              <FormControl mt={4} isInvalid={Boolean(form.errors.tos) && form.touched.tos}>
                <FormLabel htmlFor="tos">I agree MAS Terms of Service</FormLabel>
                <Checkbox {...field} id="tos" placeholder="tos" />
                <FormErrorMessage>{form.errors.tos}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Button mt={4} isLoading={isSubmitting} type="submit">
            Register
          </Button>
        </Form>
      )}
    </Formik>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Register</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={8} py={4}>
          {form}
          {extRegister}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

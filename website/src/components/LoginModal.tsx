import React, { FunctionComponent, useState } from 'react';
import 'whatwg-fetch';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  InputProps,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  Heading
} from '@chakra-ui/react';
import { Formik, Form, Field, FormikState, FormikHelpers } from 'formik';
import { IoLogoGoogle } from 'react-icons/io5';
import { getConfig } from '../lib/config';

type BaseInputRenderProps<T> = { field: InputProps; form: FormikState<T> };
type LoginValues = { username: string; password: string };
type LoginInputRenderProps = BaseInputRenderProps<LoginValues>;
type ForgotPasswordValues = { email: string };
type ForgotPasswordInputRenderProps = BaseInputRenderProps<ForgotPasswordValues>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

enum Mode {
  Login,
  ForgotPassword,
  ForgotPasswordDone
}

export const LoginModal: FunctionComponent<LoginModalProps> = ({ isOpen, onClose }: LoginModalProps) => {
  const [mode, setMode] = useState<Mode>(Mode.Login);

  const googleRedirect = () => {
    window.location.pathname = '/auth/google';
  };

  const handleLogin = async (values: LoginValues, actions: FormikHelpers<LoginValues>) => {
    let data;

    try {
      const response = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: values.password }),
        credentials: 'include'
      });

      data = await response.json();
    } catch (e) {
      actions.setErrors({ password: 'Network error. Please try again later.' });
      return;
    }

    if (data.success) {
      // Server has set the session cookie, just redirect
      window.location.pathname = '/app/';
    } else {
      actions.setErrors({ password: data.msg });
    }
  };

  const handleForgotPassword = async (values: ForgotPasswordValues, actions: FormikHelpers<ForgotPasswordValues>) => {
    let data;

    try {
      const response = await fetch('/api/v1/forgot-password', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
        credentials: 'include'
      });

      data = await response.json();
    } catch (e) {
      actions.setErrors({ email: 'Network error. Please try again later.' });
      return;
    }

    if (data.success) {
      setMode(Mode.ForgotPasswordDone);
    } else {
      actions.setErrors({ email: 'Something went wrong' });
    }
  };

  const AuthButtons = getConfig().auth.google ? (
    <Box mt={8}>
      <Heading size="sm">Sign in with an existing account</Heading>
      <Button mt={4} width="100%" onClick={googleRedirect} leftIcon={<IoLogoGoogle />}>
        Google Account
      </Button>
    </Box>
  ) : null;

  const loginPanel = mode === Mode.Login && (
    <Box>
      <Heading size="sm">Sign in with a password</Heading>
      <Formik initialValues={{ username: '', password: '' }} onSubmit={handleLogin}>
        {formProps => (
          <Form>
            <Field name="username">
              {({ field, form }: LoginInputRenderProps) => (
                <FormControl mt={4} isInvalid={!!form.errors.username}>
                  <Input {...field} id="username" placeholder="Username or email" />
                  <FormErrorMessage>{form.errors.username}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Field name="password">
              {({ field, form }: LoginInputRenderProps) => (
                <FormControl mt={4} isInvalid={Boolean(form.errors.password)}>
                  <Input {...field} type="password" id="password" placeholder="Password" />
                  <FormErrorMessage>{form.errors.password}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Button mt={4} width="100%" isLoading={formProps.isSubmitting} type="submit">
              Enter
            </Button>
            <Button mt={4} width="100%" variant="link" onClick={() => setMode(Mode.ForgotPassword)}>
              Forgot password?
            </Button>
          </Form>
        )}
      </Formik>
      {AuthButtons}
    </Box>
  );

  const forgotPasswordPanel = mode === Mode.ForgotPassword && (
    <Box>
      <Heading size="sm">Start the recovery</Heading>
      <Formik initialValues={{ email: '' }} onSubmit={handleForgotPassword}>
        {formProps => (
          <Form>
            <Field name="email">
              {({ field, form }: ForgotPasswordInputRenderProps) => (
                <FormControl mt={4}>
                  <Input {...field} id="email" placeholder="Your email address" />
                  <FormErrorMessage>{form.errors.email}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Button mt={4} width="100%" isLoading={formProps.isSubmitting} type="submit">
              Proceed
            </Button>
          </Form>
        )}
      </Formik>
      <Button mt={8} width="100%" variant="link" onClick={() => setMode(Mode.Login)}>
        Back to sign in
      </Button>
    </Box>
  );

  const forgotPasswordDonePanel = mode === Mode.ForgotPasswordDone && (
    <Box>
      <Box>Password reset email is now sent if the email address you gave matches a MAS user!</Box>
      <Box mt={4}>See your spam folder if you don&apos;t see it in couple minutes.</Box>
      <Button mt={8} width="100%" onClick={() => setMode(Mode.Login)}>
        Ok
      </Button>
    </Box>
  );

  const title = mode === Mode.Login ? 'Sign in' : mode === Mode.ForgotPassword ? 'Reset your password' : 'Done';

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xs">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={8} pt={4} pb={8}>
          {loginPanel}
          {forgotPasswordPanel}
          {forgotPasswordDonePanel}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

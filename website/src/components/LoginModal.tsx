import React, { FunctionComponent, useState } from 'react';
import 'whatwg-fetch';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
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
import { Formik, Form, Field, FormikState } from 'formik';
import { IoLogoGoogle } from 'react-icons/io5';
import { getConfig } from '../lib/config';

interface Values {
  username: string;
  password: string;
}

interface ForgotPasswordValues {
  email: string;
}

interface InputRenderProps {
  field: InputProps;
  form: FormikState<Values>;
}

interface ForgotPasswordInputRenderProps {
  field: InputProps;
  form: FormikState<ForgotPasswordValues>;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'forgotPassword' | 'forgotPasswordDone';

export const LoginModal: FunctionComponent<LoginModalProps> = ({ isOpen, onClose }: LoginModalProps) => {
  const [mode, setMode] = useState<Mode>('login');

  const googleRedirect = () => {
    window.location.pathname = '/auth/google';
  };

  const AuthButtons = getConfig().auth.google ? (
    <Box>
      <Box>Sign in with account</Box>
      <Button mt="1rem" onClick={googleRedirect} leftIcon={<IoLogoGoogle />}>
        Google Account
      </Button>
    </Box>
  ) : null;

  const loginPanel = (
    <>
      <Formik
        initialValues={{ username: '', password: '' }}
        onSubmit={(values, actions) => {
          fetch('/api/v1/login', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: values.username, password: values.password }),
            credentials: 'include'
          })
            .then(response => response.json())
            .then(data => {
              if (data.success === true) {
                // Server has set the session cookie, just redirect
                window.location.pathname = '/app/';
              } else {
                actions.setErrors(data.errors);
              }
            });
        }}
      >
        {formProps => (
          <Form>
            <Field name="realName">
              {({ field, form }: InputRenderProps) => (
                <FormControl mt="1rem" isInvalid={!!form.errors.username}>
                  <FormLabel htmlFor="username">Username or email</FormLabel>
                  <Input {...field} id="username" placeholder="name" />
                  <FormErrorMessage>{form.errors.username}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Field name="email">
              {({ field, form }: InputRenderProps) => (
                <FormControl mt="1rem" isInvalid={!!form.errors.password}>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <Input {...field} id="password" placeholder="password" />
                  <FormErrorMessage>{form.errors.password}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Button mt={4} colorScheme="teal" isLoading={formProps.isSubmitting} type="submit">
              Enter
            </Button>
          </Form>
        )}
      </Formik>
      {AuthButtons}
      <Button variant="link" onClick={() => setMode('forgotPassword')}>
        Forgot password?
      </Button>
    </>
  );

  const forgotPasswordPanel = (
    <Box>
      <Heading>Reset your password</Heading>
      <Formik
        initialValues={{ email: '' }}
        onSubmit={values => {
          fetch('/api/v1/forgot-password', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: values.email }),
            credentials: 'include'
          })
            .then(response => response.json())
            .then(data => {
              if (data.success === true) {
                setMode('forgotPasswordDone');
              }
            });
        }}
      >
        {formProps => (
          <Form>
            <Field name="email">
              {({ field, form }: ForgotPasswordInputRenderProps) => (
                <FormControl mt="1rem">
                  <FormLabel htmlFor="email">Type your email</FormLabel>
                  <Input {...field} id="email" placeholder="name" />
                  <FormErrorMessage>{form.errors.email}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Button mt={4} colorScheme="teal" isLoading={formProps.isSubmitting} type="submit">
              Proceed
            </Button>
          </Form>
        )}
      </Formik>
      <Button onClick={() => setMode('login')}>Back to sign</Button>
    </Box>
  );

  const forgotPasswordDonePanel = (
    <Box>
      <Heading>Done</Heading>
      Password reset email sent! See your spam folder if you don&apos;t see it in couple minutes.
      <Button onClick={() => setMode('login')}>Ok</Button>
    </Box>
  );

  let panel;

  if (mode === 'login') {
    panel = loginPanel;
  } else if (mode === 'forgotPassword') {
    panel = forgotPasswordPanel;
  } else {
    panel = forgotPasswordDonePanel;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xs">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sign in</ModalHeader>
        <ModalCloseButton />
        <ModalBody px="2rem" py="1rem">
          {panel}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
